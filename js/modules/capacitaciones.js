/**
 * SIMAP - Módulo de Capacitaciones y Asistencia Docente (Patrón Módulo)
 * Gestión de eventos pedagógicos y registro de asistencia vinculada
 */

const CapacitacionesModule = (() => {
  let capacitacionesCache = [];
  let docentesCache = [];
  let currentEventoSeleccionado = null;

  const getSupabase = () => window.SIMAP?.Config?.getClient() || window.SIMAP?.supabase;

  /**
   * Carga los eventos de capacitación desde Supabase
   */
  const loadCapacitaciones = async () => {
    const supabase = getSupabase();
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('capacitaciones')
        .select('*')
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;
      capacitacionesCache = data || [];
      return capacitacionesCache;
    } catch (err) {
      console.error('Error al cargar capacitaciones:', err);
      return [];
    }
  };

  /**
   * Carga todos los docentes con información de su Institución Educativa
   */
  const loadDocentes = async () => {
    const supabase = getSupabase();
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('docentes')
        .select(`
          id_docente,
          dni,
          nombres,
          apellido_paterno,
          apellido_materno,
          especialidad,
          cargo,
          instituciones_educativas ( nombre_ie, distrito )
        `)
        .order('apellido_paterno', { ascending: true });

      if (error) throw error;
      docentesCache = data || [];
      return docentesCache;
    } catch (err) {
      console.error('Error al cargar docentes para asistencia:', err);
      return [];
    }
  };

  /**
   * Carga los registros de asistencia de un evento específico
   */
  const loadAsistenciasPorEvento = async (idCapacitacion) => {
    const supabase = getSupabase();
    if (!supabase || !idCapacitacion) return [];
    try {
      const { data, error } = await supabase
        .from('asistencia_capacitaciones')
        .select('*')
        .eq('id_capacitacion', idCapacitacion);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al cargar asistencias del evento:', err);
      return [];
    }
  };

  /**
   * Genera el HTML principal del módulo con tres secciones interactivas
   */
  const render = () => {
    const today = new Date().toISOString().split('T')[0];

    return `
      <div class="space-y-6">
        <!-- Cabecera del Módulo -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Capacitaciones y Desarrollo Docente</h2>
            <p class="text-sm text-slate-500 mt-1">
              Programación de talleres pedagógicos, eventos formativos y control de asistencia docente de la UGEL.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button id="tab-tomar-asistencia" class="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors">
              Marcar Asistencia
            </button>
            <button id="tab-nueva-capacitacion" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              + Nuevo Taller / Evento
            </button>
            <button id="tab-lista-eventos" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              Lista de Talleres
            </button>
          </div>
        </div>

        <!-- ====================================================================
             VISTA 1: CONTROL Y MARCADO DE ASISTENCIA
             ==================================================================== -->
        <div id="seccion-asistencia" class="space-y-6">
          
          <!-- Selector de Evento y Resumen Informativo -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              
              <!-- Combo de Selección de Capacitación -->
              <div class="lg:col-span-1">
                <label for="select-evento-asistencia" class="form-label font-bold text-slate-800">
                  Seleccionar Evento de Capacitación:
                </label>
                <select id="select-evento-asistencia" class="form-input !pl-3">
                  <option value="">Cargando eventos...</option>
                </select>
                <p class="text-xs text-slate-400 mt-1.5">Elige el taller sobre el cual registrar la asistencia docente.</p>
              </div>

              <!-- Tarjeta de Detalles del Evento -->
              <div id="detalle-evento-box" class="lg:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-xs">
                <p class="text-slate-400 italic">Selecciona un evento en la lista izquierda para cargar el padrón docente.</p>
              </div>

            </div>
          </div>

          <!-- Métricas de Asistencia en Tiempo Real -->
          <div id="metricas-asistencia-row" class="hidden grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
              <p class="text-xs uppercase font-bold text-slate-400">Total Padrón</p>
              <h4 id="stat-total-docentes" class="text-xl font-bold text-slate-800 mt-1">0</h4>
            </div>
            <div class="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 text-center shadow-sm">
              <p class="text-xs uppercase font-bold text-emerald-600">Presentes</p>
              <h4 id="stat-presentes" class="text-xl font-bold text-emerald-700 mt-1">0</h4>
            </div>
            <div class="bg-white p-4 rounded-xl border border-red-200 bg-red-50/40 text-center shadow-sm">
              <p class="text-xs uppercase font-bold text-red-600">Ausentes</p>
              <h4 id="stat-ausentes" class="text-xl font-bold text-red-700 mt-1">0</h4>
            </div>
            <div class="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/40 text-center shadow-sm">
              <p class="text-xs uppercase font-bold text-blue-600">% Asistencia</p>
              <h4 id="stat-porcentaje" class="text-xl font-bold text-blue-700 mt-1">0%</h4>
            </div>
          </div>

          <!-- Padrón de Docentes y Marcado -->
          <div id="tabla-asistencia-card" class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 class="text-lg font-bold text-slate-900">Padrón de Docentes y Registro de Asistencia</h3>
                <p class="text-xs text-slate-500 mt-0.5">Marca los docentes presentes y guarda la relación de una sola vez en Supabase.</p>
              </div>

              <!-- Acciones Rápidas de Marcado -->
              <div class="flex items-center gap-2">
                <button type="button" id="btn-marcar-todos" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200">
                  Marcar Todos
                </button>
                <button type="button" id="btn-desmarcar-todos" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  Desmarcar Todos
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm text-slate-600">
                <thead class="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th class="py-3 px-4 text-center w-24">¿Asistió?</th>
                    <th class="py-3 px-4">Docente</th>
                    <th class="py-3 px-4">DNI</th>
                    <th class="py-3 px-4">Institución Educativa</th>
                    <th class="py-3 px-4">Especialidad</th>
                    <th class="py-3 px-4">Observaciones del Participante</th>
                  </tr>
                </thead>
                <tbody id="tabla-asistencia-body" class="divide-y divide-slate-100">
                  <tr>
                    <td colspan="6" class="py-8 text-center text-slate-400">
                      Selecciona una capacitación arriba para cargar la nómina de asistencia.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Botón Guardar Asistencia -->
            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
              <button id="btn-guardar-asistencia" class="btn-primary !w-auto px-8" disabled>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span>Guardar Registro de Asistencia</span>
              </button>
            </div>
          </div>

        </div>

        <!-- ====================================================================
             VISTA 2: FORMULARIO NUEVA CAPACITACIÓN (Oculto inicialmente)
             ==================================================================== -->
        <div id="seccion-nuevo-evento" class="hidden bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm max-w-3xl mx-auto">
          <div class="mb-6">
            <h3 class="text-xl font-bold text-slate-900">Programar Nueva Capacitación Pedagógica</h3>
            <p class="text-xs text-slate-500 mt-1">Registra talleres de fortalecimiento de competencias docentes.</p>
          </div>

          <form id="form-nueva-capacitacion" class="space-y-5">
            
            <!-- Tema del Taller -->
            <div class="form-group mb-0">
              <label for="evento-nombre" class="form-label">Tema o Título de la Capacitación *</label>
              <input 
                type="text" 
                id="evento-nombre" 
                class="form-input !pl-3" 
                placeholder="Ej: Estrategias de Comprensión Lectora y Razonamiento Crítico" 
                required
              >
            </div>

            <!-- Ponente y Modalidad -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div class="form-group mb-0">
                <label for="evento-ponente" class="form-label">Ponente / Facilitador *</label>
                <input 
                  type="text" 
                  id="evento-ponente" 
                  class="form-input !pl-3" 
                  placeholder="Ej: Dr. Juan Carlos Ramos (Especialista UGEL)" 
                  required
                >
              </div>

              <div class="form-group mb-0">
                <label for="evento-modalidad" class="form-label">Modalidad *</label>
                <select id="evento-modalidad" class="form-input !pl-3" required>
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual (Zoom / Meet)</option>
                  <option value="Híbrida">Híbrida</option>
                </select>
              </div>
            </div>

            <!-- Fechas y Horas -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div class="form-group mb-0">
                <label for="evento-fecha-inicio" class="form-label">Fecha de Inicio *</label>
                <input type="date" id="evento-fecha-inicio" value="${today}" class="form-input !pl-3" required>
              </div>

              <div class="form-group mb-0">
                <label for="evento-fecha-fin" class="form-label">Fecha de Fin *</label>
                <input type="date" id="evento-fecha-fin" value="${today}" class="form-input !pl-3" required>
              </div>

              <div class="form-group mb-0">
                <label for="evento-horas" class="form-label">Horas Pedagógicas *</label>
                <input type="number" id="evento-horas" min="1" max="200" value="6" class="form-input !pl-3" required>
              </div>
            </div>

            <!-- Descripción -->
            <div class="form-group mb-0">
              <label for="evento-descripcion" class="form-label">Objetivos y Temas a Abordar</label>
              <textarea 
                id="evento-descripcion" 
                rows="3" 
                class="form-input !pl-3 resize-none" 
                placeholder="Breve descripción de los aprendizajes esperados y competencias docentes a desarrollar..."
              ></textarea>
            </div>

            <!-- Botón de Creación -->
            <div class="pt-4 flex items-center justify-end gap-3">
              <button type="button" id="btn-cancelar-evento" class="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold">
                Cancelar
              </button>
              <button type="submit" id="btn-crear-evento" class="btn-primary !w-auto">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>Guardar y Programar Evento</span>
              </button>
            </div>

          </form>
        </div>

        <!-- ====================================================================
             VISTA 3: LISTADO Y CATÁLOGO DE EVENTOS (Oculto inicialmente)
             ==================================================================== -->
        <div id="seccion-lista-eventos" class="hidden bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Catálogo de Capacitaciones Registradas</h3>
              <p class="text-xs text-slate-500 mt-0.5">Historial completo de eventos pedagógicos creados en el sistema.</p>
            </div>
            <button id="btn-refrescar-eventos" class="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              <span>Actualizar</span>
            </button>
          </div>

          <div id="contenedor-cards-eventos" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <p class="text-slate-400 text-sm col-span-full text-center py-8">Cargando eventos...</p>
          </div>
        </div>

      </div>
    `;
  };

  /**
   * Actualiza el contador de presentes y porcentaje en tiempo real
   */
  const actualizarContadoresAsistencia = () => {
    const checkboxes = document.querySelectorAll('.check-asistencia');
    const total = checkboxes.length;
    let presentes = 0;

    checkboxes.forEach(chk => {
      if (chk.checked) presentes++;
    });

    const ausentes = total - presentes;
    const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;

    const elTotal = document.getElementById('stat-total-docentes');
    const elPresentes = document.getElementById('stat-presentes');
    const elAusentes = document.getElementById('stat-ausentes');
    const elPorcentaje = document.getElementById('stat-porcentaje');

    if (elTotal) elTotal.textContent = total;
    if (elPresentes) elPresentes.textContent = presentes;
    if (elAusentes) elAusentes.textContent = ausentes;
    if (elPorcentaje) elPorcentaje.textContent = `${porcentaje}%`;
  };

  /**
   * Carga el padrón docente y marca la asistencia preexistente para el evento seleccionado
   */
  const cargarPadronParaEvento = async (idCapacitacion) => {
    const tbody = document.getElementById('tabla-asistencia-body');
    const btnGuardar = document.getElementById('btn-guardar-asistencia');
    const metricasRow = document.getElementById('metricas-asistencia-row');
    const detalleBox = document.getElementById('detalle-evento-box');

    if (!tbody || !idCapacitacion) return;

    // Obtener detalles del evento
    const evento = capacitacionesCache.find(c => c.id_capacitacion === idCapacitacion);
    if (evento && detalleBox) {
      detalleBox.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 class="font-bold text-slate-800 text-sm">${evento.nombre_tema}</h4>
            <p class="text-slate-600 mt-0.5"><strong>Ponente:</strong> ${evento.ponente || 'No especificado'} &bull; <strong>Modalidad:</strong> ${evento.modalidad}</p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="px-2.5 py-1 rounded bg-blue-100 text-blue-700 font-semibold text-[11px]">${evento.horas_academicas} hrs académicas</span>
            <span class="px-2.5 py-1 rounded bg-slate-200 text-slate-700 font-medium text-[11px]">${evento.fecha_inicio}</span>
          </div>
        </div>
      `;
    }

    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">Cargando padrón docente...</td></tr>`;

    // Cargar docentes y asistencias guardadas
    if (docentesCache.length === 0) {
      await loadDocentes();
    }
    const asistenciasGuardadas = await loadAsistenciasPorEvento(idCapacitacion);
    const asistenciasMap = new Map();
    asistenciasGuardadas.forEach(a => asistenciasMap.set(a.id_docente, a));

    if (docentesCache.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400">
            No se encontraron docentes registrados en el sistema.
          </td>
        </tr>
      `;
      if (btnGuardar) btnGuardar.disabled = true;
      return;
    }

    // Renderizar filas de cada docente
    tbody.innerHTML = docentesCache.map(doc => {
      const asistenciaRecord = asistenciasMap.get(doc.id_docente);
      const isChecked = asistenciaRecord ? asistenciaRecord.asistio : false;
      const obs = asistenciaRecord?.observaciones || '';
      const ieNombre = doc.instituciones_educativas?.nombre_ie || 'I.E. General';

      return `
        <tr class="hover:bg-slate-50/80 transition-colors" data-id-docente="${doc.id_docente}">
          <td class="py-3 px-4 text-center">
            <input 
              type="checkbox" 
              class="check-asistencia w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" 
              data-id-docente="${doc.id_docente}"
              ${isChecked ? 'checked' : ''}
            >
          </td>
          <td class="py-3 px-4 font-semibold text-slate-900">
            ${doc.apellido_paterno} ${doc.apellido_materno}, ${doc.nombres}
          </td>
          <td class="py-3 px-4 font-mono text-xs text-slate-600">${doc.dni || 'S/D'}</td>
          <td class="py-3 px-4 text-xs text-slate-600">${ieNombre}</td>
          <td class="py-3 px-4 text-xs text-slate-500">${doc.especialidad || doc.cargo}</td>
          <td class="py-3 px-4">
            <input 
              type="text" 
              class="input-obs-asistencia form-input !py-1 !px-2 text-xs !bg-slate-50 focus:!bg-white" 
              placeholder="Observación (opcional)" 
              value="${obs}"
              data-id-docente="${doc.id_docente}"
            >
          </td>
        </tr>
      `;
    }).join('');

    if (btnGuardar) btnGuardar.disabled = false;
    if (metricasRow) metricasRow.classList.remove('hidden');

    // Escuchar cambios en checkboxes para métricas en vivo
    document.querySelectorAll('.check-asistencia').forEach(chk => {
      chk.addEventListener('change', actualizarContadoresAsistencia);
    });

    actualizarContadoresAsistencia();
  };

  /**
   * Carga la lista desplegable de eventos en la pestaña de Asistencia
   */
  const poblarSelectEventos = async () => {
    const select = document.getElementById('select-evento-asistencia');
    if (!select) return;

    select.innerHTML = '<option value="">Consultando eventos...</option>';
    const eventos = await loadCapacitaciones();

    if (eventos.length === 0) {
      select.innerHTML = '<option value="">No hay capacitaciones registradas. Crea una primero.</option>';
      return;
    }

    select.innerHTML = '<option value="">-- Seleccionar Capacitación --</option>' +
      eventos.map(e => `
        <option value="${e.id_capacitacion}" ${currentEventoSeleccionado === e.id_capacitacion ? 'selected' : ''}>
          ${e.nombre_tema} (${e.fecha_inicio})
        </option>
      `).join('');

    select.addEventListener('change', (e) => {
      currentEventoSeleccionado = e.target.value;
      if (currentEventoSeleccionado) {
        cargarPadronParaEvento(currentEventoSeleccionado);
      }
    });

    // Si ya había uno seleccionado o es el primero, cargarlo
    if (currentEventoSeleccionado) {
      cargarPadronParaEvento(currentEventoSeleccionado);
    } else if (eventos.length > 0) {
      currentEventoSeleccionado = eventos[0].id_capacitacion;
      select.value = currentEventoSeleccionado;
      cargarPadronParaEvento(currentEventoSeleccionado);
    }
  };

  /**
   * Renderiza el catálogo de tarjetas en la pestaña de eventos
   */
  const renderCardsEventos = async () => {
    const container = document.getElementById('contenedor-cards-eventos');
    if (!container) return;

    container.innerHTML = '<p class="text-slate-400 text-sm col-span-full text-center py-8">Cargando catálogo...</p>';
    const eventos = await loadCapacitaciones();

    if (eventos.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-3">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <h4 class="font-bold text-slate-800">No hay talleres registrados</h4>
          <p class="text-xs text-slate-500 mt-1">Utiliza el botón "+ Nuevo Taller / Evento" para programar el primero.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = eventos.map(e => `
      <div class="p-6 rounded-2xl border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between bg-white">
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${e.modalidad === 'Virtual' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}">
              ${e.modalidad}
            </span>
            <span class="text-xs font-semibold text-slate-400">${e.horas_academicas} hrs</span>
          </div>
          <h4 class="font-bold text-slate-900 text-base leading-snug mb-2">${e.nombre_tema}</h4>
          <p class="text-xs text-slate-500 line-clamp-2 mb-4">${e.descripcion || 'Sin descripción detallada.'}</p>
          <div class="text-xs text-slate-600 space-y-1 mb-4">
            <p><strong>Ponente:</strong> ${e.ponente || 'No asignado'}</p>
            <p><strong>Fechas:</strong> ${e.fecha_inicio} al ${e.fecha_fin}</p>
          </div>
        </div>

        <button class="btn-ir-asistencia w-full py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5" data-id="${e.id_capacitacion}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          <span>Controlar Asistencia</span>
        </button>
      </div>
    `).join('');

    // Listener para botones de control de asistencia directa
    document.querySelectorAll('.btn-ir-asistencia').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        currentEventoSeleccionado = id;
        document.getElementById('tab-tomar-asistencia')?.click();
      });
    });
  };

  /**
   * Configura listeners de eventos en la vista de capacitaciones
   */
  const setupEventListeners = () => {
    // 1. Alternancia de Pestañas
    const tabAsistencia = document.getElementById('tab-tomar-asistencia');
    const tabNuevo = document.getElementById('tab-nueva-capacitacion');
    const tabLista = document.getElementById('tab-lista-eventos');

    const secAsistencia = document.getElementById('seccion-asistencia');
    const secNuevo = document.getElementById('seccion-nuevo-evento');
    const secLista = document.getElementById('seccion-lista-eventos');

    const switchTab = (activeTab, activeSec) => {
      [secAsistencia, secNuevo, secLista].forEach(s => s?.classList.add('hidden'));
      [tabAsistencia, tabNuevo, tabLista].forEach(t => {
        if (t) t.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors';
      });

      activeSec?.classList.remove('hidden');
      if (activeTab) {
        activeTab.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors';
      }
    };

    if (tabAsistencia) {
      tabAsistencia.addEventListener('click', () => {
        switchTab(tabAsistencia, secAsistencia);
        poblarSelectEventos();
      });
    }

    if (tabNuevo) {
      tabNuevo.addEventListener('click', () => {
        switchTab(tabNuevo, secNuevo);
      });
    }

    if (tabLista) {
      tabLista.addEventListener('click', () => {
        switchTab(tabLista, secLista);
        renderCardsEventos();
      });
    }

    document.getElementById('btn-cancelar-evento')?.addEventListener('click', () => {
      tabAsistencia?.click();
    });

    document.getElementById('btn-refrescar-eventos')?.addEventListener('click', renderCardsEventos);

    // 2. Marcar y Desmarcar Todos
    document.getElementById('btn-marcar-todos')?.addEventListener('click', () => {
      document.querySelectorAll('.check-asistencia').forEach(chk => chk.checked = true);
      actualizarContadoresAsistencia();
    });

    document.getElementById('btn-desmarcar-todos')?.addEventListener('click', () => {
      document.querySelectorAll('.check-asistencia').forEach(chk => chk.checked = false);
      actualizarContadoresAsistencia();
    });

    // 3. Formulario de Nueva Capacitación
    const formNuevo = document.getElementById('form-nueva-capacitacion');
    if (formNuevo) {
      formNuevo.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = document.getElementById('evento-nombre').value.trim();
        const ponente = document.getElementById('evento-ponente').value.trim();
        const modalidad = document.getElementById('evento-modalidad').value;
        const fechaInicio = document.getElementById('evento-fecha-inicio').value;
        const fechaFin = document.getElementById('evento-fecha-fin').value;
        const horas = parseInt(document.getElementById('evento-horas').value, 10);
        const descripcion = document.getElementById('evento-descripcion').value.trim();
        const submitBtn = document.getElementById('btn-crear-evento');
        const origBtnText = submitBtn.innerHTML;

        if (!nombre || !ponente || !fechaInicio || !fechaFin || isNaN(horas)) {
          window.SIMAP?.Notification?.warning('Por favor completa los campos obligatorios (*).');
          return;
        }

        const supabase = getSupabase();
        if (!supabase) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<div class="spinner"></div><span>Guardando evento...</span>`;

        try {
          const { data, error } = await supabase
            .from('capacitaciones')
            .insert([{
              nombre_tema: nombre,
              ponente: ponente,
              modalidad: modalidad,
              fecha_inicio: fechaInicio,
              fecha_fin: fechaFin,
              horas_academicas: horas,
              descripcion: descripcion
            }])
            .select()
            .single();

          if (error) throw error;

          window.SIMAP?.Notification?.success(`¡Capacitación "<strong>${nombre}</strong>" registrada con éxito!`);
          formNuevo.reset();
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnText;

          // Seleccionar automáticamente el nuevo evento y cambiar a Asistencia
          currentEventoSeleccionado = data.id_capacitacion;
          tabAsistencia?.click();

        } catch (err) {
          console.error('Error al guardar capacitación:', err);
          window.SIMAP?.Notification?.error(`No se pudo crear el evento: ${err.message}`);
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnText;
        }
      });
    }

    // 4. Guardar Asistencia Masiva
    const btnGuardarAsistencia = document.getElementById('btn-guardar-asistencia');
    if (btnGuardarAsistencia) {
      btnGuardarAsistencia.addEventListener('click', async () => {
        if (!currentEventoSeleccionado) {
          window.SIMAP?.Notification?.warning('Selecciona una capacitación antes de guardar.');
          return;
        }

        const supabase = getSupabase();
        const session = await window.SIMAP?.Auth?.getSession();
        if (!supabase || !session?.user) {
          window.SIMAP?.Notification?.error('Sesión no válida.');
          return;
        }

        const filas = document.querySelectorAll('#tabla-asistencia-body tr');
        const registros = [];

        filas.forEach(fila => {
          const chk = fila.querySelector('.check-asistencia');
          const txtObs = fila.querySelector('.input-obs-asistencia');
          if (chk) {
            const idDocente = chk.getAttribute('data-id-docente');
            registros.push({
              id_capacitacion: currentEventoSeleccionado,
              id_docente: idDocente,
              id_usuario: session.user.id,
              asistio: chk.checked,
              observaciones: txtObs ? txtObs.value.trim() : null
            });
          }
        });

        if (registros.length === 0) {
          window.SIMAP?.Notification?.warning('No hay registros docentes que guardar.');
          return;
        }

        const origHtml = btnGuardarAsistencia.innerHTML;
        btnGuardarAsistencia.disabled = true;
        btnGuardarAsistencia.innerHTML = `<div class="spinner"></div><span>Guardando asistencias en Supabase...</span>`;

        try {
          // Upsert masivo respetando la restricción UNIQUE(id_capacitacion, id_docente)
          const { error } = await supabase
            .from('asistencia_capacitaciones')
            .upsert(registros, { onConflict: 'id_capacitacion,id_docente' });

          if (error) throw error;

          window.SIMAP?.Notification?.success('¡Registro de asistencias actualizado exitosamente!');
          btnGuardarAsistencia.disabled = false;
          btnGuardarAsistencia.innerHTML = origHtml;

        } catch (err) {
          console.error('Error al guardar asistencias masivas:', err);
          window.SIMAP?.Notification?.error(`Error al guardar asistencia: ${err.message}`);
          btnGuardarAsistencia.disabled = false;
          btnGuardarAsistencia.innerHTML = origHtml;
        }
      });
    }
  };

  /**
   * Inicializador del módulo
   */
  const init = async () => {
    await poblarSelectEventos();
    setupEventListeners();
  };

  return {
    render,
    init,
    loadCapacitaciones
  };
})();

window.SIMAP = window.SIMAP || {};
window.SIMAP.Capacitaciones = CapacitacionesModule;
