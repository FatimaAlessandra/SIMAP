/**
 * SIMAP - Módulo de Monitoreo por 5 Rúbricas de Aula MINEDU (Patrón Módulo)
 * Conexión con Supabase RPC: registrar_ficha_y_auditar
 */

const MonitoreoModule = (() => {
  let institucionesCache = [];
  let docentesCache = [];
  let fichasCache = [];

  // Definición oficial de las 5 Rúbricas de Observación de Aula (MINEDU / UGEL)
  const RUBRICAS_INFO = [
    {
      id: 1,
      romano: 'I',
      titulo: 'Involucra activamente a los estudiantes en el proceso de aprendizaje',
      descripcion: 'Promueve el interés de los estudiantes, participación activa, sentido de las actividades y comprensión del propósito.'
    },
    {
      id: 2,
      romano: 'II',
      titulo: 'Promueve el razonamiento, la creatividad y/o el pensamiento crítico',
      descripcion: 'Propone actividades pedagógicas retadoras, formulación de preguntas complejas y resolución reflexiva de problemas.'
    },
    {
      id: 3,
      romano: 'III',
      titulo: 'Evalúa el progreso de los aprendizajes para retroalimentar',
      descripcion: 'Monitorea activamente la comprensión de los estudiantes y brinda retroalimentación formativa y oportuna.'
    },
    {
      id: 4,
      romano: 'IV',
      titulo: 'Propicia un ambiente de respeto y proximidad',
      descripcion: 'Trata con calidez y respeto a los estudiantes, escucha con empatía y muestra comprensión hacia sus necesidades.'
    },
    {
      id: 5,
      romano: 'V',
      titulo: 'Regula positivamente el comportamiento de los estudiantes',
      descripcion: 'Establece normas claras y aplica mecanismos positivos y formativos para regular la convivencia en el aula.'
    }
  ];

  const getSupabase = () => window.SIMAP?.Config?.getClient() || window.SIMAP?.supabase;

  /**
   * Determina el nivel de riesgo y estilos según el puntaje acumulado (5 a 20)
   */
  const getRiskInfo = (score) => {
    const num = parseInt(score, 10);
    if (isNaN(num)) {
      return { nivel: 'Sin calificar', clase: 'bg-slate-100 text-slate-500', bg: 'bg-slate-50 border-slate-200', mensaje: '' };
    }
    if (num < 12) {
      return { 
        nivel: 'Crítico', 
        clase: 'badge-critico', 
        bg: 'bg-red-50 text-red-700 border-red-200',
        mensaje: 'Requiere acompañamiento pedagógico intensivo inmediato.' 
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
   * Consulta el historial reciente de fichas registradas con rúbricas
   */
  const loadHistorialFichas = async () => {
    const supabase = getSupabase();
    if (!supabase) return [];
    try {
      let { data, error } = await supabase
        .from('fichas_monitoreo')
        .select(`
          id_ficha,
          nro_monitoreo,
          rubrica_1,
          rubrica_2,
          rubrica_3,
          rubrica_4,
          rubrica_5,
          fecha_evaluacion,
          puntaje_total,
          nivel_riesgo,
          observaciones,
          id_docente,
          created_at,
          evaluador,
          docentes ( id_docente, nombres, apellido_paterno, apellido_materno, dni, especialidad ),
          instituciones_educativas ( id_ie, nombre_ie, distrito )
        `)
        .order('created_at', { ascending: false });

      // Fallback si la columna evaluador aún no ha sido migrada en Supabase
      if (error && error.message && error.message.includes('evaluador')) {
        const fallbackRes = await supabase
          .from('fichas_monitoreo')
          .select(`
            id_ficha,
            nro_monitoreo,
            rubrica_1,
            rubrica_2,
            rubrica_3,
            rubrica_4,
            rubrica_5,
            fecha_evaluacion,
            puntaje_total,
            nivel_riesgo,
            observaciones,
            id_docente,
            created_at,
            docentes ( id_docente, nombres, apellido_paterno, apellido_materno, dni, especialidad ),
            instituciones_educativas ( id_ie, nombre_ie, distrito )
          `)
          .order('created_at', { ascending: false });
        data = fallbackRes.data;
      } else if (error) {
        throw error;
      }

      fichasCache = data || [];
      return fichasCache;
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
            <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Monitoreo y Rúbricas de Aula</h2>
            <p class="text-sm text-slate-500 mt-1">
              Evaluación docente por las 5 Rúbricas Oficiales de Observación de Aula (MINEDU / UGEL) con cálculo automatizado de puntaje y semáforo.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button id="tab-nueva-ficha" class="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors">
              + Evaluar por Rúbricas
            </button>
            <button id="tab-matriz-monitoreo" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              <span>Matriz de Rúbricas (I, II, III)</span>
            </button>
            <button id="tab-historial-fichas" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              Ver Historial
            </button>
            <button id="tab-colegios" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              <span>Directorio de Colegios</span>
            </button>
          </div>
        </div>

        <!-- ====================================================================
             VISTA 1: FORMULARIO DE EVALUACIÓN POR 5 RÚBRICAS
             ==================================================================== -->
        <div id="seccion-formulario" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Formulario Principal -->
          <div class="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
            
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <span>Ficha de Monitoreo Pedagógico en Aula</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Asigna el nivel correspondiente (1 a 4) en cada una de las 5 rúbricas.</p>
              </div>
              <span class="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
                MINEDU / UGEL
              </span>
            </div>

            <form id="form-monitoreo" class="space-y-6">
              
              <!-- Datos Generales: Distrito, Colegio, Docente, Ronda y Fecha -->
              <div class="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200/60 space-y-4">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                  1. Datos Generales de la Visita
                </h4>

                <!-- Fila 0: Distrito -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label for="select-distrito" class="form-label mb-0 text-xs font-semibold">Distrito *</label>
                    <span class="text-[11px] text-slate-400">Filtra los colegios por jurisdicción</span>
                  </div>
                  <select id="select-distrito" class="form-input !pl-3 text-sm">
                    <option value="">-- Todos los Distritos --</option>
                  </select>
                </div>

                <!-- Fila 1: Institución Educativa -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label for="select-ie" class="form-label mb-0 text-xs font-semibold">Institución Educativa *</label>
                    <button type="button" id="btn-abrir-modal-ie" class="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                      <span>+ Agregar Colegio</span>
                    </button>
                  </div>
                  <select id="select-ie" class="form-input !pl-3 text-sm" required>
                    <option value="">-- Seleccionar Institución Educativa --</option>
                  </select>
                </div>

                <!-- Fila 2: Profesor Evaluador / Acompañante Pedagógico -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label for="select-evaluador" class="form-label mb-0 text-xs font-semibold flex items-center gap-1.5 text-slate-800">
                      <span class="w-2 h-2 rounded-full bg-indigo-600"></span>
                      <span>Profesor Evaluador / Acompañante Pedagógico *</span>
                    </label>
                    <button type="button" id="btn-toggle-evaluador-manual" class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline">
                      <span>+ Escribir otro nombre</span>
                    </button>
                  </div>
                  <div id="wrapper-evaluador-select">
                    <select id="select-evaluador" class="form-input !pl-3 text-sm">
                      <option value="">-- Seleccionar Profesor Evaluador --</option>
                    </select>
                  </div>
                  <div id="wrapper-evaluador-manual" class="hidden mt-1.5 space-y-1">
                    <input type="text" id="input-evaluador-manual" class="form-input !pl-3 text-sm" placeholder="Ej: Mg. Carlos Morales Soto (Especialista UGEL / Directivo)">
                    <span class="text-[11px] text-slate-400 block">Escribe el nombre del docente o directivo que realiza la evaluación en aula.</span>
                  </div>
                </div>

                <!-- Fila 3: Docente a Evaluar -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label for="select-docente" class="form-label mb-0 text-xs font-semibold flex items-center gap-1.5 text-slate-800">
                      <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                      <span>Profesor a Evaluar (Observado en Aula) *</span>
                    </label>
                    <button type="button" id="btn-abrir-modal-docente" class="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                      <span>+ Agregar Docente</span>
                    </button>
                  </div>
                  <select id="select-docente" class="form-input !pl-3 text-sm" required>
                    <option value="">-- Primero selecciona una Institución --</option>
                  </select>
                </div>

                <!-- Fila 3: Etapa de Monitoreo y Fecha -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label for="select-nro-monitoreo" class="form-label text-xs font-semibold">N° de Monitoreo (Ronda) *</label>
                    <select id="select-nro-monitoreo" class="form-input !pl-3 text-sm" required>
                      <option value="I" selected>I Monitoreo (Diagnóstico)</option>
                      <option value="II">II Monitoreo (Proceso / Seguimiento)</option>
                      <option value="III">III Monitoreo (Salida / Cierre)</option>
                    </select>
                  </div>

                  <div>
                    <label for="input-fecha" class="form-label text-xs font-semibold">Fecha de Visita en Aula *</label>
                    <input type="date" id="input-fecha" value="${today}" class="form-input !pl-3 text-sm" required max="${today}">
                  </div>
                </div>
              </div>

              <!-- ================================================================
                   SECCIÓN: LAS 5 RÚBRICAS DE OBSERVACIÓN DE AULA
                   ================================================================ -->
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                    2. Calificación de las 5 Rúbricas (Escala 1 a 4 puntos)
                  </h4>
                  <span class="text-xs font-medium text-slate-400">1: Muy Deficiente &bull; 2: En Proceso &bull; 3: Suficiente &bull; 4: Destacado</span>
                </div>

                <!-- Contenedor dinámico de las 5 rúbricas -->
                <div class="space-y-3.5">
                  ${RUBRICAS_INFO.map(r => `
                    <div class="p-4 rounded-xl border border-slate-200/90 hover:border-blue-400 bg-white shadow-xs transition-all rubrica-card" data-rubrica="${r.id}">
                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div class="flex items-start gap-2">
                          <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            ${r.romano}
                          </span>
                          <div>
                            <h5 class="text-xs sm:text-sm font-bold text-slate-800 leading-snug">${r.titulo}</h5>
                            <p class="text-[11px] text-slate-400 leading-tight mt-0.5">${r.descripcion}</p>
                          </div>
                        </div>
                        <span id="label-score-r${r.id}" class="text-xs font-bold text-slate-400 self-end sm:self-center bg-slate-100 px-2.5 py-0.5 rounded transition-colors">
                          Sin calificar
                        </span>
                      </div>

                      <!-- Selector de Nivel (1 a 4) -->
                      <div class="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                        <label class="relative block cursor-pointer select-none">
                          <input type="radio" name="rubrica_${r.id}" value="1" class="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 rubrica-input" data-rubrica-num="${r.id}">
                          <div class="text-center py-2 px-1 rounded-lg border border-slate-200 peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700 hover:bg-slate-50 transition-all">
                            <span class="block text-xs font-extrabold">Nivel I</span>
                            <span class="text-[10px] text-slate-500 block">1 pt</span>
                          </div>
                        </label>

                        <label class="relative block cursor-pointer select-none">
                          <input type="radio" name="rubrica_${r.id}" value="2" class="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 rubrica-input" data-rubrica-num="${r.id}">
                          <div class="text-center py-2 px-1 rounded-lg border border-slate-200 peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-700 hover:bg-slate-50 transition-all">
                            <span class="block text-xs font-extrabold">Nivel II</span>
                            <span class="text-[10px] text-slate-500 block">2 pts</span>
                          </div>
                        </label>

                        <label class="relative block cursor-pointer select-none">
                          <input type="radio" name="rubrica_${r.id}" value="3" class="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 rubrica-input" data-rubrica-num="${r.id}">
                          <div class="text-center py-2 px-1 rounded-lg border border-slate-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 hover:bg-slate-50 transition-all">
                            <span class="block text-xs font-extrabold">Nivel III</span>
                            <span class="text-[10px] text-slate-500 block">3 pts</span>
                          </div>
                        </label>

                        <label class="relative block cursor-pointer select-none">
                          <input type="radio" name="rubrica_${r.id}" value="4" class="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 rubrica-input" data-rubrica-num="${r.id}">
                          <div class="text-center py-2 px-1 rounded-lg border border-slate-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 hover:bg-slate-50 transition-all">
                            <span class="block text-xs font-extrabold">Nivel IV</span>
                            <span class="text-[10px] text-slate-500 block">4 pts</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Observaciones y Compromisos -->
              <div class="form-group mb-0">
                <label for="input-observaciones" class="form-label text-xs font-semibold">
                  3. Observaciones y Compromisos de Mejora Pedagógica
                </label>
                <textarea 
                  id="input-observaciones" 
                  rows="3" 
                  class="form-input !pl-3 resize-none text-sm" 
                  placeholder="Aspectos observados en aula, retroalimentación brindada y acuerdos tomados con el docente..."
                ></textarea>
              </div>

              <!-- Botón Guardar -->
              <div class="pt-2">
                <button type="submit" id="btn-guardar-ficha" class="btn-primary py-3.5">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>Guardar Evaluación por Rúbricas (RPC)</span>
                </button>
              </div>

            </form>
          </div>

          <!-- Columna Lateral: Resumen de Rúbricas y Semáforo en Vivo -->
          <div class="space-y-6">
            
            <!-- Tarjeta de Semaforización Dinámica -->
            <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Puntaje Acumulado y Semáforo</h4>
              
              <div id="preview-semaforo-box" class="p-6 rounded-xl border border-slate-200 bg-slate-50 transition-all duration-300">
                <span id="preview-badge" class="badge-semaforo bg-slate-200 text-slate-700 text-sm px-4 py-1.5 shadow-sm">
                  Sin calificar
                </span>
                <p id="preview-puntaje" class="text-4xl font-extrabold text-slate-700 mt-3">-- pts</p>
                <p id="preview-total-subtext" class="text-xs text-slate-400 mt-1 font-mono">(0 de 5 rúbricas evaluadas)</p>
                <p id="preview-mensaje" class="text-xs text-slate-500 mt-3 font-medium">
                  Asigna el nivel (1 al 4) en cada una de las 5 rúbricas para calcular el semáforo en vivo.
                </p>
              </div>

              <!-- Desglose Rápido de las 5 Rúbricas -->
              <div class="mt-6 pt-4 border-t border-slate-100 text-left text-xs space-y-2">
                <p class="font-bold text-slate-700">Desglose de Rúbricas:</p>
                <div class="space-y-1 text-slate-600">
                  <div class="flex items-center justify-between p-1.5 rounded bg-slate-50">
                    <span>Rúbrica I (Involucra):</span>
                    <strong id="mini-score-1" class="text-slate-400 font-normal">--</strong>
                  </div>
                  <div class="flex items-center justify-between p-1.5 rounded bg-slate-50">
                    <span>Rúbrica II (Razonamiento):</span>
                    <strong id="mini-score-2" class="text-slate-400 font-normal">--</strong>
                  </div>
                  <div class="flex items-center justify-between p-1.5 rounded bg-slate-50">
                    <span>Rúbrica III (Retroalimenta):</span>
                    <strong id="mini-score-3" class="text-slate-400 font-normal">--</strong>
                  </div>
                  <div class="flex items-center justify-between p-1.5 rounded bg-slate-50">
                    <span>Rúbrica IV (Respeto):</span>
                    <strong id="mini-score-4" class="text-slate-400 font-normal">--</strong>
                  </div>
                  <div class="flex items-center justify-between p-1.5 rounded bg-slate-50">
                    <span>Rúbrica V (Comportamiento):</span>
                    <strong id="mini-score-5" class="text-slate-400 font-normal">--</strong>
                  </div>
                </div>
              </div>

              <!-- Reglas de la Matriz UGEL -->
              <div class="mt-6 pt-4 border-t border-slate-100 text-left text-xs text-slate-500 space-y-1.5">
                <p class="font-semibold text-slate-700">Matriz de Semaforización:</p>
                <div class="flex items-center justify-between">
                  <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> 5 a 11 pts:</span>
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

          </div>

        </div>

        <!-- ====================================================================
             VISTA 2: MATRIZ DE RÚBRICAS (I, II, III MONITOREO) - IDÉNTICA A LA HOJA UGEL
             ==================================================================== -->
        <div id="seccion-matriz" class="hidden bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 class="text-xl font-bold text-slate-900 tracking-tight">MONITOREO A DOCENTES EN AULA</h3>
              <p class="text-xs text-slate-500 mt-1">
                Matriz comparativa de desempeño docente por Rúbricas (I a V) a través de las etapas: I Monitoreo, II Monitoreo y III Monitoreo.
              </p>
            </div>
            <button id="btn-recargar-matriz" class="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 self-start sm:self-auto">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              <span>Actualizar Matriz</span>
            </button>
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-xl">
            <table class="w-full text-center text-xs text-slate-700 divide-y divide-slate-200">
              <thead class="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider">
                <tr>
                  <th class="py-3 px-3 w-12 border-r border-slate-200">N°</th>
                  <th class="py-3 px-4 text-left border-r border-slate-200">DOCENTE</th>
                  <th class="py-3 px-3 w-20 border-r border-slate-200">RÚBRICA</th>
                  <th class="py-3 px-4 w-32 border-r border-slate-200 bg-blue-50/50 text-blue-900">I MONITOREO</th>
                  <th class="py-3 px-4 w-32 border-r border-slate-200 bg-indigo-50/50 text-indigo-900">II MONITOREO</th>
                  <th class="py-3 px-4 w-32 border-r border-slate-200 bg-purple-50/50 text-purple-900">III MONITOREO</th>
                  <th class="py-3 px-4 w-36">ÚLTIMO SEMÁFORO</th>
                </tr>
              </thead>
              <tbody id="tabla-matriz-body" class="divide-y divide-slate-200">
                <tr>
                  <td colspan="7" class="py-8 text-center text-slate-400">Generando matriz de rúbricas...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ====================================================================
             VISTA 3: HISTORIAL DE FICHAS DETALLADAS
             ==================================================================== -->
        <div id="seccion-historial" class="hidden bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-slate-900">Historial Detallado de Evaluaciones</h3>
            <button id="btn-recargar-historial" class="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              <span>Actualizar</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th class="py-3 px-3">Fecha</th>
                  <th class="py-3 px-3 text-center">Ronda</th>
                  <th class="py-3 px-4">Docente Evaluado</th>
                  <th class="py-3 px-4">Profesor / Monitor Evaluador</th>
                  <th class="py-3 px-4">I.E.</th>
                  <th class="py-3 px-3 text-center">R1</th>
                  <th class="py-3 px-3 text-center">R2</th>
                  <th class="py-3 px-3 text-center">R3</th>
                  <th class="py-3 px-3 text-center">R4</th>
                  <th class="py-3 px-3 text-center">R5</th>
                  <th class="py-3 px-3 text-center">Total</th>
                  <th class="py-3 px-4 text-center">Semáforo</th>
                </tr>
              </thead>
              <tbody id="tabla-fichas-body" class="divide-y divide-slate-100 text-xs">
                <tr>
                  <td colspan="12" class="py-8 text-center text-slate-400">Cargando fichas...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ====================================================================
             VISTA 4: DIRECTORIO DE COLEGIOS (I.E.)
             ==================================================================== -->
        <div id="seccion-colegios" class="hidden bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Directorio de Instituciones Educativas (Colegios)</h3>
              <p class="text-xs text-slate-500 mt-0.5">Gestión de colegios de la UGEL disponibles para monitoreos y capacitaciones.</p>
            </div>
            <button id="btn-nuevo-colegio-tab" class="btn-primary !w-auto text-xs px-4 py-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              <span>Registrar Nuevo Colegio</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4">Cód. Modular</th>
                  <th class="py-3 px-4">Nombre de la Institución Educativa</th>
                  <th class="py-3 px-4">Distrito</th>
                  <th class="py-3 px-4">Nivel Educativo</th>
                  <th class="py-3 px-4 text-center">Docentes Registrados</th>
                </tr>
              </thead>
              <tbody id="tabla-colegios-body" class="divide-y divide-slate-100">
                <tr>
                  <td colspan="5" class="py-8 text-center text-slate-400">Cargando colegios...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- ====================================================================
           MODAL 1: REGISTRAR NUEVO COLEGIO (I.E.)
           ==================================================================== -->
      <div id="modal-nueva-ie" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm hidden">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
          <div class="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Registrar Nuevo Colegio (I.E.)</h3>
              <p class="text-xs text-slate-500">Agrega una nueva institución educativa a la base de datos.</p>
            </div>
            <button type="button" id="btn-cerrar-modal-ie" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <form id="form-modal-ie" class="space-y-4">
            <div>
              <label for="ie-codigo" class="form-label text-xs font-semibold">Código Modular *</label>
              <input type="text" id="ie-codigo" class="form-input !pl-3 text-sm" placeholder="Ej: 0412858" required maxlength="10">
            </div>

            <div>
              <label for="ie-nombre" class="form-label text-xs font-semibold">Nombre de la Institución Educativa *</label>
              <input type="text" id="ie-nombre" class="form-input !pl-3 text-sm" placeholder="Ej: I.E. 81023 Carlos Gutiérrez Noriega" required>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="ie-distrito" class="form-label text-xs font-semibold">Distrito *</label>
                <input type="text" id="ie-distrito" list="distritos-list-suggestions" class="form-input !pl-3 text-sm" placeholder="Ej: Chepén, Pacanga, Pueblo Nuevo" required value="Chepén">
                <datalist id="distritos-list-suggestions">
                  <option value="Chepén">
                  <option value="Pacanga">
                  <option value="Pueblo Nuevo">
                </datalist>
              </div>

              <div>
                <label for="ie-nivel" class="form-label text-xs font-semibold">Nivel Educativo *</label>
                <select id="ie-nivel" class="form-input !pl-3 text-sm" required>
                  <option value="Secundaria">Secundaria</option>
                  <option value="Primaria">Primaria</option>
                  <option value="Inicial">Inicial</option>
                  <option value="Superior">Superior</option>
                </select>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button type="button" id="btn-cancelar-modal-ie" class="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button type="submit" id="btn-guardar-modal-ie" class="btn-primary !w-auto text-xs px-5 py-2">
                Guardar Colegio
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ====================================================================
           MODAL 2: REGISTRAR NUEVO DOCENTE
           ==================================================================== -->
      <div id="modal-nuevo-docente" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm hidden">
        <div class="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Registrar Nuevo Docente</h3>
              <p class="text-xs text-slate-500">Agrega un docente asignándolo a su colegio correspondiente.</p>
            </div>
            <button type="button" id="btn-cerrar-modal-docente" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <form id="form-modal-docente" class="space-y-4">
            <div>
              <label for="docente-modal-ie" class="form-label text-xs font-semibold">Institución Educativa *</label>
              <select id="docente-modal-ie" class="form-input !pl-3 text-sm" required>
                <option value="">-- Seleccionar Colegio --</option>
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label for="docente-dni" class="form-label text-xs font-semibold">DNI (8 dígitos) *</label>
                <input type="text" id="docente-dni" class="form-input !pl-3 text-sm" placeholder="Ej: 45892134" maxlength="8" required>
              </div>

              <div class="sm:col-span-2">
                <label for="docente-nombres" class="form-label text-xs font-semibold">Nombres *</label>
                <input type="text" id="docente-nombres" class="form-input !pl-3 text-sm" placeholder="Ej: Nora" required>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="docente-paterno" class="form-label text-xs font-semibold">Apellido Paterno *</label>
                <input type="text" id="docente-paterno" class="form-input !pl-3 text-sm" placeholder="Ej: Quispe" required>
              </div>

              <div>
                <label for="docente-materno" class="form-label text-xs font-semibold">Apellido Materno *</label>
                <input type="text" id="docente-materno" class="form-input !pl-3 text-sm" placeholder="Ej: Flores" required>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label for="docente-sexo" class="form-label text-xs font-semibold">Sexo *</label>
                <select id="docente-sexo" class="form-input !pl-3 text-sm" required>
                  <option value="FEMENINO">Femenino</option>
                  <option value="MASCULINO">Masculino</option>
                </select>
              </div>

              <div class="sm:col-span-2">
                <label for="docente-especialidad" class="form-label text-xs font-semibold">Especialidad / Área *</label>
                <input type="text" id="docente-especialidad" class="form-input !pl-3 text-sm" placeholder="Ej: Comunicación, Matemática, CTA" required>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="docente-cargo" class="form-label text-xs font-semibold">Cargo *</label>
                <input type="text" id="docente-cargo" class="form-input !pl-3 text-sm" value="Profesor de Aula" required>
              </div>

              <div>
                <label for="docente-jornada" class="form-label text-xs font-semibold">Jornada (Horas) *</label>
                <input type="number" id="docente-jornada" class="form-input !pl-3 text-sm" value="30" min="1" max="40" required>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button type="button" id="btn-cancelar-modal-docente" class="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button type="submit" id="btn-guardar-modal-docente" class="btn-primary !w-auto text-xs px-5 py-2">
                Guardar Docente
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  };

  /**
   * Obtiene los valores actuales de las 5 rúbricas seleccionadas en el formulario
   */
  const getSelectedRubricas = () => {
    const values = {};
    let total = 0;
    let count = 0;

    for (let i = 1; i <= 5; i++) {
      const checked = document.querySelector(`input[name="rubrica_${i}"]:checked`);
      if (checked) {
        const val = parseInt(checked.value, 10);
        values[`r${i}`] = val;
        total += val;
        count++;
      } else {
        values[`r${i}`] = null;
      }
    }

    return { 
      ...values, 
      total, 
      count, 
      allSelected: count === 5 
    };
  };

  /**
   * Actualiza el cuadro de semaforización y etiquetas en tiempo real al cambiar cualquier rúbrica
   */
  const updateLivePreviewFromRubricas = () => {
    try {
      const { r1, r2, r3, r4, r5, total, count, allSelected } = getSelectedRubricas();

      const levelInfo = {
        1: { text: 'Nivel I (1 pt)', class: 'bg-red-100 text-red-700', miniClass: 'text-red-600 font-bold' },
        2: { text: 'Nivel II (2 pts)', class: 'bg-amber-100 text-amber-700', miniClass: 'text-amber-600 font-bold' },
        3: { text: 'Nivel III (3 pts)', class: 'bg-blue-100 text-blue-700', miniClass: 'text-blue-600 font-bold' },
        4: { text: 'Nivel IV (4 pts)', class: 'bg-emerald-100 text-emerald-700', miniClass: 'text-emerald-600 font-bold' }
      };

      const rubricaValues = [r1, r2, r3, r4, r5];

      // Actualizar etiquetas individuales en las cards y en el desglose lateral
      for (let i = 1; i <= 5; i++) {
        const val = rubricaValues[i - 1];
        const lbl = document.getElementById(`label-score-r${i}`);
        const mini = document.getElementById(`mini-score-${i}`);

        if (val && levelInfo[val]) {
          if (lbl) {
            lbl.textContent = levelInfo[val].text;
            lbl.className = `text-xs font-bold self-end sm:self-center px-2.5 py-0.5 rounded transition-colors ${levelInfo[val].class}`;
          }
          if (mini) {
            mini.textContent = `${val} pts`;
            mini.className = levelInfo[val].miniClass;
          }
        } else {
          if (lbl) {
            lbl.textContent = 'Sin calificar';
            lbl.className = 'text-xs font-bold text-slate-400 self-end sm:self-center bg-slate-100 px-2.5 py-0.5 rounded transition-colors';
          }
          if (mini) {
            mini.textContent = '--';
            mini.className = 'text-slate-400 font-normal';
          }
        }
      }

      // Actualizar caja del semáforo lateral
      const previewBox = document.getElementById('preview-semaforo-box');
      const badge = document.getElementById('preview-badge');
      const scoreText = document.getElementById('preview-puntaje');
      const subtext = document.getElementById('preview-total-subtext');
      const mensaje = document.getElementById('preview-mensaje');

      if (!previewBox || !badge || !scoreText) return;

      if (!allSelected) {
        badge.textContent = count === 0 ? 'Sin calificar' : `En evaluación (${count}/5)`;
        badge.className = 'badge-semaforo bg-slate-200 text-slate-700 text-sm px-4 py-1.5 shadow-sm';
        scoreText.textContent = count === 0 ? '-- pts' : `${total} pts`;
        if (subtext) subtext.textContent = `(${count} de 5 rúbricas evaluadas)`;
        if (mensaje) {
          mensaje.textContent = count === 0 
            ? 'Asigna el nivel (1 al 4) en cada una de las 5 rúbricas para calcular el semáforo en vivo.' 
            : `Faltan calificar ${5 - count} rúbrica(s) para obtener el semáforo final.`;
          mensaje.className = 'text-xs text-slate-500 mt-3 font-medium';
        }
        previewBox.className = 'p-6 rounded-xl border border-slate-200 bg-slate-50 transition-all duration-300';
      } else {
        // Cuando las 5 rúbricas están seleccionadas:
        const info = getRiskInfo(total);
        badge.textContent = info.nivel;
        badge.className = `badge-semaforo ${info.clase} text-sm px-4 py-1.5 shadow-sm`;
        scoreText.textContent = `${total} pts`;
        if (subtext) subtext.textContent = '(De 20 puntos posibles)';
        if (mensaje) {
          mensaje.textContent = info.mensaje;
          let msgColor = 'text-slate-600';
          if (total < 12) msgColor = 'text-red-700';
          else if (total < 16) msgColor = 'text-amber-800';
          else msgColor = 'text-emerald-700';
          mensaje.className = `text-xs mt-3 font-medium ${msgColor}`;
        }
        previewBox.className = `p-6 rounded-xl border transition-all duration-300 ${info.bg}`;
      }

      // Asegurar que la ventana raíz permanezca fija
      if (window.scrollY > 0) {
        window.scrollTo(0, 0);
      }
    } catch (err) {
      console.warn('Error en cálculo de rúbricas:', err);
    }
  };

  /**
   * Actualiza las opciones del combo de Instituciones Educativas según el distrito
   */
  const actualizarComboIE = (distritoFiltro = '', ieIdToSelect = null) => {
    const selectIE = document.getElementById('select-ie');
    if (!selectIE) return;

    const colegiosFiltrados = distritoFiltro 
      ? institucionesCache.filter(ie => (ie.distrito || '').trim().toLowerCase() === distritoFiltro.trim().toLowerCase())
      : institucionesCache;

    if (colegiosFiltrados.length === 0) {
      selectIE.innerHTML = '<option value="">No hay colegios en este distrito. ¡Haz clic en + Agregar Colegio!</option>';
      actualizarComboDocentes(null);
      actualizarComboEvaluadores(null);
      return;
    }

    selectIE.innerHTML = '<option value="">-- Seleccionar Institución Educativa --</option>' + 
      colegiosFiltrados.map(ie => `
        <option value="${ie.id_ie}" ${ieIdToSelect === ie.id_ie ? 'selected' : ''}>
          ${ie.nombre_ie} (${ie.distrito} - ${ie.nivel_educativo})
        </option>
      `).join('');

    // Si había un colegio seleccionado y sigue existiendo en el filtro, mantenerlo
    if (ieIdToSelect && colegiosFiltrados.some(ie => ie.id_ie === ieIdToSelect)) {
      selectIE.value = ieIdToSelect;
      actualizarComboDocentes(ieIdToSelect);
      actualizarComboEvaluadores(ieIdToSelect);
    } else {
      actualizarComboDocentes(null);
      actualizarComboEvaluadores(null);
    }
  };

  /**
   * Actualiza las opciones del combo de Docentes según la I.E.
   */
  const actualizarComboDocentes = (ieId, selectTeacherId = null) => {
    const selectDocente = document.getElementById('select-docente');
    if (!selectDocente) return;

    if (!ieId) {
      selectDocente.innerHTML = '<option value="">-- Primero selecciona una Institución --</option>';
      return;
    }

    const docentesIE = docentesCache.filter(d => d.id_ie === ieId);
    if (docentesIE.length === 0) {
      selectDocente.innerHTML = '<option value="">No hay docentes registrados en este colegio. ¡Haz clic en + Agregar Docente!</option>';
    } else {
      selectDocente.innerHTML = '<option value="">-- Seleccionar Docente a Evaluar --</option>' +
        docentesIE.map(d => `
          <option value="${d.id_docente}" ${selectTeacherId === d.id_docente ? 'selected' : ''}>
            ${d.apellido_paterno} ${d.apellido_materno}, ${d.nombres} - ${d.especialidad || d.cargo} (DNI: ${d.dni || 'S/D'})
          </option>
        `).join('');
    }
  };

  /**
   * Actualiza las opciones del combo de Profesor Evaluador / Acompañante
   */
  const actualizarComboEvaluadores = async (ieId = null, selectEvaluadorId = null) => {
    const selectEvaluador = document.getElementById('select-evaluador');
    if (!selectEvaluador) return;

    let userName = 'Especialista UGEL';
    try {
      const session = await window.SIMAP?.Auth?.getSession();
      const userMeta = session?.user?.user_metadata || {};
      userName = userMeta.full_name || userMeta.nombres || session?.user?.email?.split('@')[0] || 'Especialista UGEL';
    } catch (e) {
      console.warn('No se pudo obtener usuario de sesión:', e);
    }

    let html = `
      <optgroup label="Usuario en Sesión (Tú)">
        <option value="USER:${userName}" ${(!selectEvaluadorId || selectEvaluadorId.startsWith('USER:')) ? 'selected' : ''}>
          ${userName} (Especialista UGEL / Directivo Conectado)
        </option>
      </optgroup>
    `;

    if (ieId) {
      const docentesIE = docentesCache.filter(d => d.id_ie === ieId);
      if (docentesIE.length > 0) {
        html += `
          <optgroup label="Directivos y Docentes de esta Institución">
            ${docentesIE.map(d => `
              <option value="DOC:${d.id_docente}:${d.apellido_paterno} ${d.apellido_materno}, ${d.nombres}" ${selectEvaluadorId === d.id_docente ? 'selected' : ''}>
                ${d.apellido_paterno} ${d.apellido_materno}, ${d.nombres} - ${d.cargo || 'Profesor'} (${d.especialidad || 'General'})
              </option>
            `).join('')}
          </optgroup>
        `;
      }
    }

    const otrosDocentes = ieId ? docentesCache.filter(d => d.id_ie !== ieId) : docentesCache;
    if (otrosDocentes.length > 0) {
      html += `
        <optgroup label="Docentes de Otras Instituciones / Red UGEL">
          ${otrosDocentes.map(d => `
            <option value="DOC:${d.id_docente}:${d.apellido_paterno} ${d.apellido_materno}, ${d.nombres}" ${selectEvaluadorId === d.id_docente ? 'selected' : ''}>
              ${d.apellido_paterno} ${d.apellido_materno}, ${d.nombres} - ${d.cargo || 'Profesor'}
            </option>
          `).join('')}
        </optgroup>
      `;
    }

    selectEvaluador.innerHTML = html;
  };

  /**
   * Llena los combos de Distrito, Instituciones, Evaluadores y Docentes
   */
  const populateCombos = async (distritoOrOpts = null, selectedIeIdPre = null, selectedDocenteIdPre = null) => {
    const selectDistrito = document.getElementById('select-distrito');
    const selectIE = document.getElementById('select-ie');
    const modalSelectIE = document.getElementById('docente-modal-ie');

    if (!selectIE) return;

    selectIE.innerHTML = '<option value="">Cargando instituciones...</option>';
    await loadInstituciones();
    await loadDocentes();

    // Normalizar argumentos
    let selectedDistrito = null;
    let selectedIe = selectedIeIdPre;
    let selectedDoc = selectedDocenteIdPre;

    if (typeof distritoOrOpts === 'object' && distritoOrOpts !== null) {
      selectedDistrito = distritoOrOpts.distrito || null;
      selectedIe = distritoOrOpts.ieId || null;
      selectedDoc = distritoOrOpts.docenteId || null;
    } else if (typeof distritoOrOpts === 'string') {
      const ieMatch = institucionesCache.find(i => i.id_ie === distritoOrOpts);
      if (ieMatch) {
        selectedDistrito = ieMatch.distrito;
        selectedIe = ieMatch.id_ie;
        selectedDoc = selectedIeIdPre;
      } else {
        selectedDistrito = distritoOrOpts;
      }
    }

    // 1. Población del combo de Distritos
    const baseDistritos = ['Chepén', 'Pacanga', 'Pueblo Nuevo'];
    const dbDistritos = institucionesCache.map(ie => ie.distrito).filter(Boolean);
    const distritosUnicos = Array.from(new Set([...baseDistritos, ...dbDistritos])).sort();

    if (selectDistrito) {
      selectDistrito.innerHTML = `
        <option value="">-- Todos los Distritos --</option>
        ${distritosUnicos.map(d => `
          <option value="${d}" ${selectedDistrito && selectedDistrito.toLowerCase() === d.toLowerCase() ? 'selected' : ''}>
            Distrito de ${d}
          </option>
        `).join('')}
      `;
    }

    // 2. Población del combo de Instituciones con filtro si corresponde
    actualizarComboIE(selectedDistrito || '', selectedIe);

    // 3. Población del combo de Docentes y Evaluadores
    if (selectedIe) {
      actualizarComboDocentes(selectedIe, selectedDoc);
      await actualizarComboEvaluadores(selectedIe);
    } else {
      actualizarComboDocentes(null);
      await actualizarComboEvaluadores(null);
    }

    // 4. Modal de nuevo docente: combo de colegios
    if (modalSelectIE) {
      modalSelectIE.innerHTML = '<option value="">-- Seleccionar Colegio --</option>' + 
        institucionesCache.map(ie => `<option value="${ie.id_ie}" ${selectedIe === ie.id_ie ? 'selected' : ''}>${ie.nombre_ie} (${ie.distrito})</option>`).join('');
    }
  };

  /**
   * Renderiza la Matriz Oficial de Rúbricas (I, II, III Monitoreo)
   * Idéntica a la ficha institucional de acompañamiento pedagógico
   */
  const renderMatrizTable = async () => {
    const tbody = document.getElementById('tabla-matriz-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">Generando matriz de rúbricas desde Supabase...</td></tr>`;

    if (docentesCache.length === 0) await loadDocentes();
    const fichas = await loadHistorialFichas();

    if (docentesCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No hay docentes registrados.</td></tr>`;
      return;
    }

    // Agrupar fichas por docente e identificar puntajes por ronda (I, II, III)
    let html = '';
    const romanos = ['I', 'II', 'III', 'IV', 'V'];

    docentesCache.forEach((doc, index) => {
      const fichasDocente = fichas.filter(f => f.id_docente === doc.id_docente);
      
      // Buscar la ficha de cada monitoreo
      const fMon1 = fichasDocente.find(f => f.nro_monitoreo === 'I');
      const fMon2 = fichasDocente.find(f => f.nro_monitoreo === 'II');
      const fMon3 = fichasDocente.find(f => f.nro_monitoreo === 'III');

      // Último semáforo registrado y evaluador
      const ultimaFicha = fichasDocente[0];
      let semaforoBadge = '<span class="text-slate-300 italic text-[11px]">Sin evaluar</span>';
      let evaluadorSubtext = '';
      if (ultimaFicha) {
        let badgeClass = 'badge-satisfactorio';
        if (ultimaFicha.nivel_riesgo === 'Crítico') badgeClass = 'badge-critico';
        else if (ultimaFicha.nivel_riesgo === 'En Proceso') badgeClass = 'badge-proceso';
        semaforoBadge = `<span class="badge-semaforo ${badgeClass} text-[10px]">${ultimaFicha.nivel_riesgo} (${ultimaFicha.puntaje_total} pts)</span>`;

        let evalName = ultimaFicha.evaluador;
        if (!evalName && ultimaFicha.observaciones) {
          const m = ultimaFicha.observaciones.match(/\[Evaluador:\s*([^\]]+)\]/i);
          if (m) evalName = m[1].trim();
        }
        if (evalName) {
          evaluadorSubtext = `<span class="block text-[10px] text-indigo-600 font-medium mt-0.5 truncate max-w-[180px]" title="Evaluador: ${evalName}">Eval: ${evalName}</span>`;
        }
      }

      // Renderizar 5 filas por docente (una por cada rúbrica I, II, III, IV, V)
      for (let r = 1; r <= 5; r++) {
        const val1 = fMon1 ? (fMon1[`rubrica_${r}`] || '-') : '-';
        const val2 = fMon2 ? (fMon2[`rubrica_${r}`] || '-') : '-';
        const val3 = fMon3 ? (fMon3[`rubrica_${r}`] || '-') : '-';

        if (r === 1) {
          // Primera fila del docente con rowspan 5
          html += `
            <tr class="hover:bg-slate-50/70 transition-colors border-t-2 border-slate-200">
              <td rowspan="5" class="py-3 px-3 font-bold text-slate-600 bg-slate-50/50 border-r border-slate-200 align-middle">
                ${index + 1}
              </td>
              <td rowspan="5" class="py-3 px-4 font-bold text-slate-900 border-r border-slate-200 align-middle text-left">
                ${doc.nombres} ${doc.apellido_paterno}
                <span class="block text-[10px] text-slate-400 font-normal">DNI: ${doc.dni || 'S/D'} &bull; ${doc.especialidad || doc.cargo}</span>
                ${evaluadorSubtext}
              </td>
              <td class="py-2 px-3 font-bold text-blue-700 bg-blue-50/30 border-r border-slate-200">${romanos[r - 1]}</td>
              <td class="py-2 px-4 border-r border-slate-200 font-bold ${val1 !== '-' ? 'text-slate-800' : 'text-slate-300'}">${val1}</td>
              <td class="py-2 px-4 border-r border-slate-200 font-bold ${val2 !== '-' ? 'text-slate-800' : 'text-slate-300'}">${val2}</td>
              <td class="py-2 px-4 border-r border-slate-200 font-bold ${val3 !== '-' ? 'text-slate-800' : 'text-slate-300'}">${val3}</td>
              <td rowspan="5" class="py-3 px-4 align-middle bg-slate-50/30">
                ${semaforoBadge}
              </td>
            </tr>
          `;
        } else {
          // Filas de las rúbricas II, III, IV, V
          html += `
            <tr class="hover:bg-slate-50/70 transition-colors">
              <td class="py-2 px-3 font-bold text-blue-700 bg-blue-50/30 border-r border-slate-200">${romanos[r - 1]}</td>
              <td class="py-2 px-4 border-r border-slate-200 font-bold ${val1 !== '-' ? 'text-slate-800' : 'text-slate-300'}">${val1}</td>
              <td class="py-2 px-4 border-r border-slate-200 font-bold ${val2 !== '-' ? 'text-slate-800' : 'text-slate-300'}">${val2}</td>
              <td class="py-2 px-4 border-r border-slate-200 font-bold ${val3 !== '-' ? 'text-slate-800' : 'text-slate-300'}">${val3}</td>
            </tr>
          `;
        }
      }
    });

    tbody.innerHTML = html;
  };

  /**
   * Renderiza el listado en la tabla de historial detallado
   */
  const renderHistorialTable = async () => {
    const tbody = document.getElementById('tabla-fichas-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="12" class="py-8 text-center text-slate-400">Consultando Supabase...</td></tr>`;
    const fichas = await loadHistorialFichas();

    if (fichas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" class="py-8 text-center text-slate-400">No hay fichas registradas aún.</td></tr>`;
      return;
    }

    tbody.innerHTML = fichas.map(f => {
      const docName = f.docentes ? `${f.docentes.apellido_paterno} ${f.docentes.nombres}` : 'Docente';
      const ieName = f.instituciones_educativas?.nombre_ie || 'I.E. General';
      
      let evaluadorName = f.evaluador;
      if (!evaluadorName && f.observaciones) {
        const match = f.observaciones.match(/\[Evaluador:\s*([^\]]+)\]/i);
        if (match) evaluadorName = match[1].trim();
      }
      if (!evaluadorName) evaluadorName = 'Especialista UGEL';

      let badgeClass = 'badge-satisfactorio';
      if (f.nivel_riesgo === 'Crítico') badgeClass = 'badge-critico';
      else if (f.nivel_riesgo === 'En Proceso') badgeClass = 'badge-proceso';

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="py-2.5 px-3 font-medium whitespace-nowrap">${f.fecha_evaluacion}</td>
          <td class="py-2.5 px-3 text-center">
            <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
              ${f.nro_monitoreo || 'I'}
            </span>
          </td>
          <td class="py-2.5 px-4 font-bold text-slate-900">${docName}</td>
          <td class="py-2.5 px-4 text-xs font-semibold text-indigo-700 whitespace-nowrap">
            <span class="inline-flex items-center gap-1 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100/80">
              <svg class="w-3 h-3 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              <span>${evaluadorName}</span>
            </span>
          </td>
          <td class="py-2.5 px-4 text-slate-500 max-w-[150px] truncate" title="${ieName}">${ieName}</td>
          <td class="py-2.5 px-3 text-center font-bold text-slate-700 bg-slate-50/50">${f.rubrica_1 || '-'}</td>
          <td class="py-2.5 px-3 text-center font-bold text-slate-700 bg-slate-50/50">${f.rubrica_2 || '-'}</td>
          <td class="py-2.5 px-3 text-center font-bold text-slate-700 bg-slate-50/50">${f.rubrica_3 || '-'}</td>
          <td class="py-2.5 px-3 text-center font-bold text-slate-700 bg-slate-50/50">${f.rubrica_4 || '-'}</td>
          <td class="py-2.5 px-3 text-center font-bold text-slate-700 bg-slate-50/50">${f.rubrica_5 || '-'}</td>
          <td class="py-2.5 px-3 text-center font-extrabold text-blue-700">${f.puntaje_total}</td>
          <td class="py-2.5 px-4 text-center">
            <span class="badge-semaforo ${badgeClass} text-[10px] px-2 py-0.5">${f.nivel_riesgo}</span>
          </td>
        </tr>
      `;
    }).join('');
  };

  /**
   * Renderiza el directorio de colegios
   */
  const renderColegiosTable = async () => {
    const tbody = document.getElementById('tabla-colegios-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">Consultando colegios...</td></tr>`;
    const colegios = await loadInstituciones();
    const docentes = await loadDocentes();

    if (colegios.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">No hay colegios registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = colegios.map(c => {
      const cantidadDocentes = docentes.filter(d => d.id_ie === c.id_ie).length;

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="py-3 px-4 font-mono font-bold text-xs text-blue-600">${c.cod_modular}</td>
          <td class="py-3 px-4 font-semibold text-slate-900">${c.nombre_ie}</td>
          <td class="py-3 px-4 text-slate-600">${c.distrito}</td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              ${c.nivel_educativo}
            </span>
          </td>
          <td class="py-3 px-4 text-center">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cantidadDocentes > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}">
              ${cantidadDocentes} docentes
            </span>
          </td>
        </tr>
      `;
    }).join('');
  };

  /**
   * Configura listeners de eventos en la vista de monitoreo
   */
  const setupEventListeners = () => {
    // 1. Alternar entre pestañas
    const tabForm = document.getElementById('tab-nueva-ficha');
    const tabMatriz = document.getElementById('tab-matriz-monitoreo');
    const tabHistorial = document.getElementById('tab-historial-fichas');
    const tabColegios = document.getElementById('tab-colegios');

    const secForm = document.getElementById('seccion-formulario');
    const secMatriz = document.getElementById('seccion-matriz');
    const secHistorial = document.getElementById('seccion-historial');
    const secColegios = document.getElementById('seccion-colegios');

    const switchTab = (activeTab, activeSec) => {
      [secForm, secMatriz, secHistorial, secColegios].forEach(s => s?.classList.add('hidden'));
      [tabForm, tabMatriz, tabHistorial, tabColegios].forEach(t => {
        if (t) t.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors';
      });

      activeSec?.classList.remove('hidden');
      if (activeTab) {
        activeTab.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors';
      }
    };

    if (tabForm) tabForm.addEventListener('click', () => switchTab(tabForm, secForm));
    if (tabMatriz) {
      tabMatriz.addEventListener('click', () => {
        switchTab(tabMatriz, secMatriz);
        renderMatrizTable();
      });
    }
    if (tabHistorial) {
      tabHistorial.addEventListener('click', () => {
        switchTab(tabHistorial, secHistorial);
        renderHistorialTable();
      });
    }
    if (tabColegios) {
      tabColegios.addEventListener('click', () => {
        switchTab(tabColegios, secColegios);
        renderColegiosTable();
      });
    }

    document.getElementById('btn-recargar-matriz')?.addEventListener('click', renderMatrizTable);
    document.getElementById('btn-recargar-historial')?.addEventListener('click', renderHistorialTable);

    // 2. Filtro en Cascada: Distrito -> Institución Educativa -> Docentes
    const selectDistrito = document.getElementById('select-distrito');
    const selectIE = document.getElementById('select-ie');

    selectDistrito?.addEventListener('change', () => {
      actualizarComboIE(selectDistrito.value);
    });

    selectIE?.addEventListener('change', () => {
      const ieId = selectIE.value;
      if (ieId) {
        const ieObj = institucionesCache.find(i => i.id_ie === ieId);
        if (ieObj && ieObj.distrito && selectDistrito) {
          if (selectDistrito.value !== ieObj.distrito) {
            selectDistrito.value = ieObj.distrito;
          }
        }
      }
      actualizarComboDocentes(ieId);
      actualizarComboEvaluadores(ieId);
    });

    // Toggle entre selector y modo manual para el Profesor Evaluador
    const btnToggleEvaluador = document.getElementById('btn-toggle-evaluador-manual');
    const wrapperSelectEval = document.getElementById('wrapper-evaluador-select');
    const wrapperManualEval = document.getElementById('wrapper-evaluador-manual');
    const inputManualEval = document.getElementById('input-evaluador-manual');
    const selectEvaluador = document.getElementById('select-evaluador');

    btnToggleEvaluador?.addEventListener('click', () => {
      const isHidden = wrapperManualEval?.classList.contains('hidden');
      if (isHidden) {
        wrapperManualEval?.classList.remove('hidden');
        wrapperSelectEval?.classList.add('hidden');
        btnToggleEvaluador.textContent = '← Seleccionar de la lista';
        inputManualEval?.focus();
      } else {
        wrapperManualEval?.classList.add('hidden');
        wrapperSelectEval?.classList.remove('hidden');
        btnToggleEvaluador.textContent = '+ Escribir otro nombre';
      }
    });

    // 3. Modales de Creación Rápida
    const modalIE = document.getElementById('modal-nueva-ie');
    const modalDocente = document.getElementById('modal-nuevo-docente');

    const abrirModal = (modal) => modal?.classList.remove('hidden');
    const cerrarModal = (modal) => modal?.classList.add('hidden');

    document.getElementById('btn-abrir-modal-ie')?.addEventListener('click', () => abrirModal(modalIE));
    document.getElementById('btn-nuevo-colegio-tab')?.addEventListener('click', () => abrirModal(modalIE));
    document.getElementById('btn-cerrar-modal-ie')?.addEventListener('click', () => cerrarModal(modalIE));
    document.getElementById('btn-cancelar-modal-ie')?.addEventListener('click', () => cerrarModal(modalIE));

    document.getElementById('btn-abrir-modal-docente')?.addEventListener('click', () => {
      const currentIe = document.getElementById('select-ie')?.value;
      if (currentIe) {
        const modalSelectIe = document.getElementById('docente-modal-ie');
        if (modalSelectIe) modalSelectIe.value = currentIe;
      }
      abrirModal(modalDocente);
    });
    document.getElementById('btn-cerrar-modal-docente')?.addEventListener('click', () => cerrarModal(modalDocente));
    document.getElementById('btn-cancelar-modal-docente')?.addEventListener('click', () => cerrarModal(modalDocente));

    // 4. Formulario Modal Colegio
    const formModalIE = document.getElementById('form-modal-ie');
    if (formModalIE) {
      formModalIE.addEventListener('submit', async (e) => {
        e.preventDefault();

        const codigo = document.getElementById('ie-codigo').value.trim();
        const nombre = document.getElementById('ie-nombre').value.trim();
        const distrito = document.getElementById('ie-distrito').value.trim();
        const nivel = document.getElementById('ie-nivel').value;
        const btnSubmit = document.getElementById('btn-guardar-modal-ie');
        const origText = btnSubmit.innerHTML;

        const supabase = getSupabase();
        if (!supabase) return;

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<div class="spinner"></div><span>Guardando...</span>`;

        try {
          let nuevaIE = null;
          const { data, error } = await supabase
            .from('instituciones_educativas')
            .insert([{ cod_modular: codigo, nombre_ie: nombre, distrito: distrito, nivel_educativo: nivel }])
            .select()
            .single();

          if (error) {
            // Si hay restricción RLS o permiso denegado, recurrir a la función RPC con SECURITY DEFINER
            if (error.message?.toLowerCase().includes('row-level security') || error.code === '42501') {
              const { data: rpcData, error: rpcError } = await supabase.rpc('registrar_colegio', {
                p_cod_modular: codigo,
                p_nombre_ie: nombre,
                p_distrito: distrito,
                p_nivel_educativo: nivel
              });
              if (rpcError) throw rpcError;
              nuevaIE = rpcData;
            } else {
              throw error;
            }
          } else {
            nuevaIE = data;
          }

          window.SIMAP?.Notification?.success(`¡Colegio "<strong>${nombre}</strong>" registrado con éxito!`);
          cerrarModal(modalIE);
          formModalIE.reset();
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = origText;

          await populateCombos({ distrito: nuevaIE?.distrito || distrito, ieId: nuevaIE?.id_ie });
          renderColegiosTable();

        } catch (err) {
          console.error('Error al registrar colegio:', err);
          window.SIMAP?.Notification?.error(err.message || 'Error al guardar el colegio.');
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = origText;
        }
      });
    }

    // 5. Formulario Modal Docente
    const formModalDocente = document.getElementById('form-modal-docente');
    if (formModalDocente) {
      formModalDocente.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idIe = document.getElementById('docente-modal-ie').value;
        const dni = document.getElementById('docente-dni').value.trim();
        const nombres = document.getElementById('docente-nombres').value.trim();
        const paterno = document.getElementById('docente-paterno').value.trim();
        const materno = document.getElementById('docente-materno').value.trim();
        const sexo = document.getElementById('docente-sexo').value;
        const especialidad = document.getElementById('docente-especialidad').value.trim();
        const cargo = document.getElementById('docente-cargo').value.trim();
        const jornada = parseInt(document.getElementById('docente-jornada').value, 10);
        const btnSubmit = document.getElementById('btn-guardar-modal-docente');
        const origText = btnSubmit.innerHTML;

        const supabase = getSupabase();
        if (!supabase) return;

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<div class="spinner"></div><span>Guardando...</span>`;

        try {
          let nuevoDocente = null;
          const { data, error } = await supabase
            .from('docentes')
            .insert([{
              id_ie: idIe,
              dni: dni,
              nombres: nombres,
              apellido_paterno: paterno,
              apellido_materno: materno,
              sexo: sexo,
              especialidad: especialidad,
              cargo: cargo,
              jornada: jornada
            }])
            .select()
            .single();

          if (error) {
            // Si hay restricción RLS o permiso denegado, recurrir a la función RPC con SECURITY DEFINER
            if (error.message?.toLowerCase().includes('row-level security') || error.code === '42501') {
              const { data: rpcData, error: rpcError } = await supabase.rpc('registrar_docente_seguro', {
                p_id_ie: idIe,
                p_dni: dni,
                p_nombres: nombres,
                p_apellido_paterno: paterno,
                p_apellido_materno: materno,
                p_sexo: sexo,
                p_especialidad: especialidad,
                p_cargo: cargo,
                p_jornada: jornada
              });
              if (rpcError) throw rpcError;
              nuevoDocente = rpcData;
            } else {
              throw error;
            }
          } else {
            nuevoDocente = data;
          }

          window.SIMAP?.Notification?.success(`¡Docente "<strong>${nombres} ${paterno}</strong>" registrado!`);
          cerrarModal(modalDocente);
          formModalDocente.reset();
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = origText;

          const ieObj = institucionesCache.find(i => i.id_ie === idIe);
          await populateCombos({ distrito: ieObj?.distrito || null, ieId: idIe, docenteId: nuevoDocente?.id_docente });

        } catch (err) {
          console.error('Error al registrar docente:', err);
          window.SIMAP?.Notification?.error(err.message || 'Error al guardar el docente.');
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = origText;
        }
      });
    }

    // 6. Escuchar cambios en los radio buttons de las 5 rúbricas
    document.querySelectorAll('.rubrica-input').forEach(input => {
      input.addEventListener('change', () => {
        updateLivePreviewFromRubricas();
        if (window.scrollY > 0) {
          window.scrollTo(0, 0);
        }
      });
    });

    // 7. Envío del Formulario de Monitoreo por Rúbricas
    const formMonitoreo = document.getElementById('form-monitoreo');
    if (formMonitoreo) {
      formMonitoreo.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idIE = document.getElementById('select-ie')?.value;
        const idDocente = document.getElementById('select-docente')?.value;
        const nroMonitoreo = document.getElementById('select-nro-monitoreo')?.value;
        const fecha = document.getElementById('input-fecha')?.value;
        const observaciones = document.getElementById('input-observaciones')?.value.trim();
        const submitBtn = document.getElementById('btn-guardar-ficha');
        const originalBtnHtml = submitBtn?.innerHTML;

        // Obtener el Profesor Evaluador
        let evaluadorNombre = '';
        let idDocenteEvaluador = null;

        const isManualEval = wrapperManualEval && !wrapperManualEval.classList.contains('hidden');
        if (isManualEval) {
          evaluadorNombre = inputManualEval?.value.trim() || '';
          if (!evaluadorNombre) {
            window.SIMAP?.Notification?.warning('Por favor ingresa el nombre del profesor o especialista evaluador.');
            inputManualEval?.focus();
            return;
          }
        } else {
          const evalVal = selectEvaluador?.value || '';
          if (!evalVal) {
            window.SIMAP?.Notification?.warning('Por favor selecciona el profesor o especialista evaluador.');
            return;
          }
          if (evalVal.startsWith('USER:')) {
            evaluadorNombre = evalVal.replace('USER:', '').trim();
          } else if (evalVal.startsWith('DOC:')) {
            const parts = evalVal.split(':');
            idDocenteEvaluador = parts[1];
            evaluadorNombre = parts.slice(2).join(':').trim();
          } else {
            evaluadorNombre = evalVal;
          }
        }

        if (!idIE || !idDocente) {
          window.SIMAP?.Notification?.warning('Por favor selecciona la Institución Educativa y el Profesor a evaluar.');
          return;
        }

        if (idDocenteEvaluador && idDocenteEvaluador === idDocente) {
          window.SIMAP?.Notification?.warning('El profesor evaluador no puede ser la misma persona que está siendo evaluada en aula.');
          return;
        }

        if (!fecha) {
          window.SIMAP?.Notification?.warning('Por favor selecciona la Fecha de Visita en Aula.');
          return;
        }

        const { r1, r2, r3, r4, r5, total, count, allSelected } = getSelectedRubricas();

        if (!allSelected) {
          window.SIMAP?.Notification?.warning(
            `Debes calificar las 5 rúbricas del docente. Has calificado ${count} de 5 rúbricas.`
          );

          // Hacer scroll suave hacia la primera rúbrica pendiente dentro del contenedor interno #app-content
          for (let i = 1; i <= 5; i++) {
            if (!document.querySelector(`input[name="rubrica_${i}"]:checked`)) {
              const card = document.querySelector(`[data-rubrica="${i}"]`);
              if (card) {
                const appContent = document.getElementById('app-content');
                if (appContent) {
                  const cardRect = card.getBoundingClientRect();
                  const containerRect = appContent.getBoundingClientRect();
                  const targetScrollTop = appContent.scrollTop + (cardRect.top - containerRect.top) - 100;
                  appContent.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                }
                card.classList.add('ring-2', 'ring-blue-500');
                setTimeout(() => card.classList.remove('ring-2', 'ring-blue-500'), 2500);
              }
              break;
            }
          }
          if (window.scrollY > 0) {
            window.scrollTo(0, 0);
          }
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
          <span>Procesando Rúbricas en Supabase...</span>
        `;

        try {
          const obsConEvaluador = evaluadorNombre 
            ? `[Evaluador: ${evaluadorNombre}] ${observaciones}`
            : observaciones;

          let data = null;

          // Intento 1: Llamar RPC con soporte de evaluador
          try {
            const res = await supabase.rpc('registrar_ficha_y_auditar', {
              p_id_usuario: session.user.id,
              p_id_docente: idDocente,
              p_id_ie: idIE,
              p_fecha: fecha,
              p_puntaje: total,
              p_obs: obsConEvaluador,
              p_r1: r1,
              p_r2: r2,
              p_r3: r3,
              p_r4: r4,
              p_r5: r5,
              p_nro_monitoreo: nroMonitoreo,
              p_evaluador: evaluadorNombre,
              p_id_docente_evaluador: idDocenteEvaluador
            });
            if (res.error) throw res.error;
            data = res.data;
          } catch (rpcErr) {
            // Fallback al RPC estándar de 12 parámetros si la BD aún no tiene la firma de 14
            console.warn('Fallback a RPC estándar (12 args):', rpcErr.message);
            const resFallback = await supabase.rpc('registrar_ficha_y_auditar', {
              p_id_usuario: session.user.id,
              p_id_docente: idDocente,
              p_id_ie: idIE,
              p_fecha: fecha,
              p_puntaje: total,
              p_obs: obsConEvaluador,
              p_r1: r1,
              p_r2: r2,
              p_r3: r3,
              p_r4: r4,
              p_r5: r5,
              p_nro_monitoreo: nroMonitoreo
            });
            if (resFallback.error) throw resFallback.error;
            data = resFallback.data;
          }

          // Si la tabla fichas_monitoreo tiene la columna evaluador, actualizarla directamente
          if (data?.id_ficha && evaluadorNombre) {
            try {
              await supabase.from('fichas_monitoreo').update({
                evaluador: evaluadorNombre,
                id_docente_evaluador: idDocenteEvaluador
              }).eq('id_ficha', data.id_ficha);
            } catch (updateColErr) {
              console.log('Nota: columna evaluador no presente aún en tabla física.');
            }
          }

          const nivelCalculado = data?.nivel_riesgo || (total < 12 ? 'Crítico' : (total < 16 ? 'En Proceso' : 'Satisfactorio'));
          
          window.SIMAP?.Notification?.success(
            `¡${nroMonitoreo} Monitoreo registrado! Docente evaluado con: <strong>${total} pts</strong> (Semáforo: <strong>${nivelCalculado}</strong>). Evaluador: <em>${evaluadorNombre}</em>.`
          );

          // Resetear el formulario y las rúbricas
          document.getElementById('input-observaciones').value = '';
          if (inputManualEval) inputManualEval.value = '';
          if (wrapperManualEval && !wrapperManualEval.classList.contains('hidden')) {
            btnToggleEvaluador?.click();
          }
          document.querySelectorAll('.rubrica-input').forEach(input => { input.checked = false; });
          updateLivePreviewFromRubricas();
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;

          // Cambiar a la pestaña Matriz de Rúbricas para ver el resultado comparativo
          if (tabMatriz) {
            tabMatriz.click();
          }

        } catch (err) {
          console.error('Error al ejecutar RPC:', err);
          window.SIMAP?.Notification?.error(`Error en la transacción RPC: ${err.message || 'Verifica la función en Supabase'}`);
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      });
    }
  };

  /**
   * Inicializador del módulo
   */
  const init = async () => {
    await populateCombos();
    setupEventListeners();
    updateLivePreviewFromRubricas();
  };

  return {
    render,
    init,
    loadHistorialFichas,
    loadInstituciones,
    loadDocentes
  };
})();

window.SIMAP = window.SIMAP || {};
window.SIMAP.Monitoreo = MonitoreoModule;
