/**
 * SIMAP - Módulo de Monitoreo y Semaforización (Patrón Módulo)
 * Conexión con Supabase RPC: registrar_ficha_y_auditar
 */

const MonitoreoModule = (() => {
  let institucionesCache = [];
  let docentesCache = [];

  const getSupabase = () => window.SIMAP?.Config?.getClient() || window.SIMAP?.supabase;

  /**
   * Determina el nivel de riesgo y estilos según el puntaje (0 a 20)
   */
  const getRiskInfo = (score) => {
    const num = parseInt(score, 10);
    if (isNaN(num)) {
      return { nivel: 'Sin calificar', clase: 'bg-slate-100 text-slate-500', icon: '' };
    }
    if (num < 12) {
      return { 
        nivel: 'Crítico', 
        clase: 'badge-critico', 
        bg: 'bg-red-50 text-red-700 border-red-200',
        mensaje: 'Requiere acompañamiento intensivo inmediato.' 
      };
    } else if (num >= 12 && num < 16) {
      return { 
        nivel: 'En Proceso', 
        clase: 'badge-proceso', 
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        mensaje: 'Nivel intermedio. Necesita refuerzo pedagógico continuo.' 
      };
    } else {
      return { 
        nivel: 'Satisfactorio', 
        clase: 'badge-satisfactorio', 
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        mensaje: 'Cumple satisfactoriamente con los estándares docentes.' 
      };
    }
  };

  /**
   * Carga las instituciones educativas desde Supabase
   */
  const loadInstituciones = async () => {
    const supabase = getSupabase();
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('instituciones_educativas')
        .select('*')
        .order('nombre_ie', { ascending: true });

      if (error) throw error;
      institucionesCache = data || [];
      return institucionesCache;
    } catch (err) {
      console.error('Error al cargar instituciones:', err);
      return [];
    }
  };

  /**
   * Carga los docentes desde Supabase
   */
  const loadDocentes = async () => {
    const supabase = getSupabase();
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('docentes')
        .select(`
          id_docente,
          id_ie,
          dni,
          nombres,
          apellido_paterno,
          apellido_materno,
          especialidad,
          cargo
        `)
        .order('apellido_paterno', { ascending: true });

      if (error) throw error;
      docentesCache = data || [];
      return docentesCache;
    } catch (err) {
      console.error('Error al cargar docentes:', err);
      return [];
    }
  };

  /**
   * Consulta el historial reciente de fichas registradas
   */
  const loadHistorialFichas = async () => {
    const supabase = getSupabase();
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('fichas_monitoreo')
        .select(`
          id_ficha,
          fecha_evaluacion,
          puntaje_total,
          nivel_riesgo,
          observaciones,
          created_at,
          docentes ( nombres, apellido_paterno, dni, especialidad ),
          instituciones_educativas ( nombre_ie, distrito )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al cargar historial de fichas:', err);
      return [];
    }
  };

  /**
   * Genera el HTML de la vista principal del módulo
   */
  const render = () => {
    const today = new Date().toISOString().split('T')[0];

    return `
      <div class="space-y-6">
        <!-- Encabezado de la Sección -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Monitoreo y Semaforización Pedagógica</h2>
            <p class="text-sm text-slate-500 mt-1">
              Registro de visitas de acompañamiento con cálculo automático de riesgo y registro de auditoría en Supabase.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button id="tab-nueva-ficha" class="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors">
              + Registrar Ficha
            </button>
            <button id="tab-historial-fichas" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              Ver Historial
            </button>
          </div>
        </div>

        <!-- VISTA 1: Formulario de Registro de Ficha -->
        <div id="seccion-formulario" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Formulario Principal -->
          <div class="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
            <h3 class="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Nueva Ficha de Monitoreo Pedagógico
            </h3>

            <form id="form-monitoreo" class="space-y-5">
              
              <!-- Fila 1: Institución Educativa -->
              <div class="form-group mb-0">
                <label for="select-ie" class="form-label">Institución Educativa</label>
                <select id="select-ie" class="form-input !pl-3" required>
                  <option value="">-- Seleccionar Institución Educativa --</option>
                </select>
              </div>

              <!-- Fila 2: Docente Acompañado -->
              <div class="form-group mb-0">
                <label for="select-docente" class="form-label">Docente Acompañado</label>
                <select id="select-docente" class="form-input !pl-3" required>
                  <option value="">-- Primero selecciona una Institución --</option>
                </select>
              </div>

              <!-- Fila 3: Fecha de Evaluación y Puntaje -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div class="form-group mb-0">
                  <label for="input-fecha" class="form-label">Fecha de Visita / Monitoreo</label>
                  <input type="date" id="input-fecha" value="${today}" class="form-input !pl-3" required max="${today}">
                </div>

                <div class="form-group mb-0">
                  <label for="input-puntaje" class="form-label">Puntaje Total Obtenido (0 - 20 pts)</label>
                  <input 
                    type="number" 
                    id="input-puntaje" 
                    min="0" 
                    max="20" 
                    step="1" 
                    value="15" 
                    class="form-input !pl-3 text-lg font-bold text-blue-700" 
                    required
                  >
                </div>
              </div>

              <!-- Observaciones / Compromisos -->
              <div class="form-group mb-0">
                <label for="input-observaciones" class="form-label">Observaciones y Compromisos de Mejora Pedagógica</label>
                <textarea 
                  id="input-observaciones" 
                  rows="3" 
                  class="form-input !pl-3 resize-none" 
                  placeholder="Describe los aspectos pedagógicos observados, fortalezas identificadas y acuerdos tomados con el docente..."
                ></textarea>
              </div>

              <!-- Botón Guardar -->
              <div class="pt-4">
                <button type="submit" id="btn-guardar-ficha" class="btn-primary">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>Procesar y Guardar Ficha (RPC)</span>
                </button>
              </div>

            </form>
          </div>

          <!-- Columna Lateral: Motor de Semaforización en Tiempo Real -->
          <div class="space-y-6">
            
            <!-- Tarjeta de Semaforización Dinámica -->
            <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Previsualización de Semáforo</h4>
              
              <div id="preview-semaforo-box" class="p-6 rounded-xl border border-amber-200 bg-amber-50 transition-all duration-300">
                <span id="preview-badge" class="badge-semaforo badge-proceso text-sm px-4 py-1.5 shadow-sm">
                  En Proceso
                </span>
                <p id="preview-puntaje" class="text-3xl font-extrabold text-slate-800 mt-3">15 pts</p>
                <p id="preview-mensaje" class="text-xs text-amber-800 mt-2 font-medium">
                  Nivel intermedio. Necesita refuerzo pedagógico continuo.
                </p>
              </div>

              <!-- Reglas de Negocio Institucionales -->
              <div class="mt-6 pt-4 border-t border-slate-100 text-left text-xs text-slate-500 space-y-2">
                <p class="font-semibold text-slate-700">Reglas del Algoritmo (UGEL):</p>
                <div class="flex items-center justify-between">
                  <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> Menor a 12 pts:</span>
                  <span class="font-bold text-red-600">Crítico</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 12 a 15 pts:</span>
                  <span class="font-bold text-amber-600">En Proceso</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 16 a 20 pts:</span>
                  <span class="font-bold text-emerald-600">Satisfactorio</span>
                </div>
              </div>
            </div>

            <!-- Información de Transaccionalidad -->
            <div class="bg-blue-50/70 p-5 rounded-2xl border border-blue-100 text-xs text-blue-800">
              <div class="flex items-start gap-2">
                <svg class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p>
                  Al guardar, la función RPC <code>registrar_ficha_y_auditar</code> calcula el riesgo en PostgreSQL y crea simultáneamente el log en <code>audit_logs</code> en una transacción atómica.
                </p>
              </div>
            </div>

          </div>

        </div>

        <!-- VISTA 2: Historial de Fichas (Oculto inicialmente) -->
        <div id="seccion-historial" class="hidden bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-slate-900">Historial de Evaluaciones y Fichas</h3>
            <button id="btn-recargar-historial" class="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              <span>Actualizar</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4">Fecha</th>
                  <th class="py-3 px-4">Docente Evaluado</th>
                  <th class="py-3 px-4">Institución Educativa</th>
                  <th class="py-3 px-4 text-center">Puntaje</th>
                  <th class="py-3 px-4 text-center">Nivel de Riesgo</th>
                  <th class="py-3 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody id="tabla-fichas-body" class="divide-y divide-slate-100">
                <tr>
                  <td colspan="6" class="py-8 text-center text-slate-400">
                    Cargando historial de fichas...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  };

  /**
   * Actualiza el cuadro de previsualización del semáforo según el puntaje ingresado
   */
  const updateLivePreview = (score) => {
    const previewBox = document.getElementById('preview-semaforo-box');
    const badge = document.getElementById('preview-badge');
    const scoreText = document.getElementById('preview-puntaje');
    const mensaje = document.getElementById('preview-mensaje');

    if (!previewBox || !badge) return;

    const info = getRiskInfo(score);
    badge.textContent = info.nivel;
    badge.className = `badge-semaforo ${info.clase} text-sm px-4 py-1.5 shadow-sm`;
    scoreText.textContent = `${score || 0} pts`;
    mensaje.textContent = info.mensaje;

    // Colores del contenedor
    previewBox.className = `p-6 rounded-xl border transition-all duration-300 ${info.bg}`;
  };

  /**
   * Llena los combos de Instituciones y Docentes
   */
  const populateCombos = async () => {
    const selectIE = document.getElementById('select-ie');
    const selectDocente = document.getElementById('select-docente');

    if (!selectIE || !selectDocente) return;

    selectIE.innerHTML = '<option value="">Cargando instituciones...</option>';
    const instituciones = await loadInstituciones();
    const docentes = await loadDocentes();

    // Llenar IE
    if (instituciones.length === 0) {
      selectIE.innerHTML = '<option value="">No hay colegios registrados (Ejecuta el script SQL)</option>';
    } else {
      selectIE.innerHTML = '<option value="">-- Seleccionar Institución Educativa --</option>' + 
        instituciones.map(ie => `<option value="${ie.id_ie}">${ie.nombre_ie} (${ie.distrito})</option>`).join('');
    }

    // Evento al seleccionar Institución -> Filtrar Docentes
    selectIE.addEventListener('change', () => {
      const selectedIeId = selectIE.value;
      if (!selectedIeId) {
        selectDocente.innerHTML = '<option value="">-- Primero selecciona una Institución --</option>';
        return;
      }

      // Filtrar docentes de esta IE
      const docentesIE = docentesCache.filter(d => d.id_ie === selectedIeId);
      if (docentesIE.length === 0) {
        selectDocente.innerHTML = '<option value="">No hay docentes registrados en este colegio</option>';
      } else {
        selectDocente.innerHTML = '<option value="">-- Seleccionar Docente --</option>' +
          docentesIE.map(d => `
            <option value="${d.id_docente}">
              ${d.apellido_paterno} ${d.apellido_materno}, ${d.nombres} - ${d.especialidad || d.cargo} (DNI: ${d.dni || 'S/D'})
            </option>
          `).join('');
      }
    });
  };

  /**
   * Renderiza el listado en la tabla de historial
   */
  const renderHistorialTable = async () => {
    const tbody = document.getElementById('tabla-fichas-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">Consultando Supabase...</td></tr>`;
    const fichas = await loadHistorialFichas();

    if (fichas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400">
            No se han registrado fichas de monitoreo todavía. ¡Sé el primero en crear una!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = fichas.map(f => {
      const docenteName = f.docentes ? `${f.docentes.apellido_paterno} ${f.docentes.nombres}` : 'Docente no especificado';
      const docenteDni = f.docentes?.dni ? `(DNI: ${f.docentes.dni})` : '';
      const ieName = f.instituciones_educativas?.nombre_ie || 'I.E. General';
      
      let badgeClass = 'badge-satisfactorio';
      if (f.nivel_riesgo === 'Crítico') badgeClass = 'badge-critico';
      else if (f.nivel_riesgo === 'En Proceso') badgeClass = 'badge-proceso';

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">${f.fecha_evaluacion}</td>
          <td class="py-3 px-4">
            <span class="font-semibold text-slate-900 block">${docenteName}</span>
            <span class="text-xs text-slate-400">${f.docentes?.especialidad || 'Docente'} ${docenteDni}</span>
          </td>
          <td class="py-3 px-4 text-slate-600">${ieName}</td>
          <td class="py-3 px-4 text-center font-bold text-slate-900">${f.puntaje_total}</td>
          <td class="py-3 px-4 text-center">
            <span class="badge-semaforo ${badgeClass}">${f.nivel_riesgo}</span>
          </td>
          <td class="py-3 px-4 text-xs text-slate-500 max-w-xs truncate" title="${f.observaciones || ''}">
            ${f.observaciones || '<span class="text-slate-300 italic">Sin observaciones</span>'}
          </td>
        </tr>
      `;
    }).join('');
  };

  /**
   * Configura listeners de eventos en la vista de monitoreo
   */
  const setupEventListeners = () => {
    // 1. Alternar entre pestañas: Formulario vs Historial
    const tabForm = document.getElementById('tab-nueva-ficha');
    const tabHistorial = document.getElementById('tab-historial-fichas');
    const secForm = document.getElementById('seccion-formulario');
    const secHistorial = document.getElementById('seccion-historial');

    if (tabForm && tabHistorial) {
      tabForm.addEventListener('click', () => {
        secForm.classList.remove('hidden');
        secHistorial.classList.add('hidden');
        tabForm.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors';
        tabHistorial.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors';
      });

      tabHistorial.addEventListener('click', () => {
        secForm.classList.add('hidden');
        secHistorial.classList.remove('hidden');
        tabHistorial.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors';
        tabForm.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors';
        renderHistorialTable();
      });
    }

    const btnReload = document.getElementById('btn-recargar-historial');
    if (btnReload) {
      btnReload.addEventListener('click', renderHistorialTable);
    }

    // 2. Puntaje en tiempo real
    const inputPuntaje = document.getElementById('input-puntaje');
    if (inputPuntaje) {
      inputPuntaje.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (val > 20) { val = 20; e.target.value = 20; }
        if (val < 0) { val = 0; e.target.value = 0; }
        updateLivePreview(val);
      });
    }

    // 3. Envío del Formulario (Llamada RPC)
    const form = document.getElementById('form-monitoreo');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idIE = document.getElementById('select-ie').value;
        const idDocente = document.getElementById('select-docente').value;
        const fecha = document.getElementById('input-fecha').value;
        const puntaje = parseInt(document.getElementById('input-puntaje').value, 10);
        const observaciones = document.getElementById('input-observaciones').value.trim();
        const submitBtn = document.getElementById('btn-guardar-ficha');
        const originalBtnHtml = submitBtn.innerHTML;

        if (!idIE || !idDocente || !fecha || isNaN(puntaje)) {
          window.SIMAP?.Notification?.warning('Por favor completa todos los campos requeridos.');
          return;
        }

        const supabase = getSupabase();
        const session = await window.SIMAP?.Auth?.getSession();

        if (!supabase || !session?.user?.id) {
          window.SIMAP?.Notification?.error('Sesión no válida o no autenticada.');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <div class="spinner"></div>
          <span>Ejecutando Función RPC en Supabase...</span>
        `;

        try {
          // Invocar la Función Stored Procedure / RPC
          const { data, error } = await supabase.rpc('registrar_ficha_y_auditar', {
            p_id_usuario: session.user.id,
            p_id_docente: idDocente,
            p_id_ie: idIE,
            p_fecha: fecha,
            p_puntaje: puntaje,
            p_obs: observaciones
          });

          if (error) {
            throw error;
          }

          const nivelCalculado = data?.nivel_riesgo || (puntaje < 12 ? 'Crítico' : (puntaje < 16 ? 'En Proceso' : 'Satisfactorio'));
          
          window.SIMAP?.Notification?.success(
            `¡Ficha registrada con éxito! Nivel de riesgo asignado: <strong>${nivelCalculado}</strong> y auditoría guardada.`
          );

          // Limpiar observaciones y resetear
          document.getElementById('input-observaciones').value = '';
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;

          // Cambiar a la pestaña de historial para ver la ficha recién guardada
          if (tabHistorial) {
            tabHistorial.click();
          }

        } catch (err) {
          console.error('Error al ejecutar RPC registrar_ficha_y_auditar:', err);
          window.SIMAP?.Notification?.error(`Error en la transacción RPC: ${err.message || 'Verifica los permisos en Supabase'}`);
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      });
    }
  };

  /**
   * Inicializador del módulo cuando se monta la vista en el Router
   */
  const init = async () => {
    await populateCombos();
    setupEventListeners();
    updateLivePreview(document.getElementById('input-puntaje')?.value || 15);
  };

  return {
    render,
    init,
    loadHistorialFichas
  };
})();

window.SIMAP = window.SIMAP || {};
window.SIMAP.Monitoreo = MonitoreoModule;
