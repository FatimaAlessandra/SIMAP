/**
 * SIMAP - Módulo de Visualización de Datos y Dashboard Principal (Patrón Módulo)
 * Extrae datos reales desde Supabase y calcula métricas de semaforización y asistencias.
 */

const DashboardModule = (() => {
  const getSupabase = () => window.SIMAP?.Config?.getClient() || window.SIMAP?.supabase;

  /**
   * Consulta las métricas consolidadas desde Supabase
   */
  const fetchDashboardData = async () => {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      // 1. Obtener todas las fichas de monitoreo con datos de docente e IE
      const { data: fichas, error: errFichas } = await supabase
        .from('fichas_monitoreo')
        .select(`
          id_ficha,
          puntaje_total,
          nivel_riesgo,
          fecha_evaluacion,
          observaciones,
          docentes ( nombres, apellido_paterno, especialidad ),
          instituciones_educativas ( nombre_ie )
        `)
        .order('fecha_evaluacion', { ascending: false });

      if (errFichas) throw errFichas;

      // 2. Obtener capacitaciones
      const { data: capacitaciones, error: errCap } = await supabase
        .from('capacitaciones')
        .select('*')
        .order('fecha_inicio', { ascending: false });

      if (errCap) throw errCap;

      // 3. Obtener todas las asistencias registradas
      const { data: asistencias, error: errAsist } = await supabase
        .from('asistencia_capacitaciones')
        .select('id_asistencia, asistio');

      if (errAsist) throw errAsist;

      // 4. Conteo de docentes registrados en el sistema
      const { count: totalDocentes, error: errDoc } = await supabase
        .from('docentes')
        .select('*', { count: 'exact', head: true });

      if (errDoc) throw errDoc;

      return {
        fichas: fichas || [],
        capacitaciones: capacitaciones || [],
        asistencias: asistencias || [],
        totalDocentes: totalDocentes || 0
      };

    } catch (err) {
      console.error('Error al consultar datos del dashboard:', err);
      return null;
    }
  };

  /**
   * Genera el HTML inicial del Dashboard con estados de carga
   */
  const render = () => {
    const user = JSON.parse(localStorage.getItem('simap_user') || '{}');
    const nombreUsuario = user.nombres || 'Especialista';
    const rolUsuario = user.roles?.nombre_rol || 'Especialista Pedagógico';

    return `
      <div class="space-y-6">
        
        <!-- Banner Principal de Bienvenida y Acciones -->
        <div class="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="relative z-10 max-w-2xl">
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-blue-100">
                ${rolUsuario}
              </span>
              <span class="text-xs text-blue-200">&bull; UGEL Gestión Pedagógica</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">¡Hola, ${nombreUsuario}!</h2>
            <p class="text-blue-100 text-xs sm:text-sm mt-1 leading-relaxed font-medium">
              Sistema Web de Monitoreo, Semaforización e Inteligencia de Acompañamiento Pedagógico (SIMAP)
            </p>
            <p class="text-blue-200 text-xs mt-0.5">
              Resumen ejecutivo en tiempo real: monitoreos docentes, semaforización de riesgos y asistencias a capacitaciones.
            </p>
          </div>

          <div class="relative z-10 flex items-center gap-3 flex-shrink-0">
            <button id="btn-refresh-dashboard" class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              <span>Actualizar Datos</span>
            </button>
            <a href="#/monitoreo" class="px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold transition-all shadow-md">
              + Nueva Ficha
            </a>
          </div>

          <!-- Patrón decorativo -->
          <div class="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        <!-- KPI CARDS: Métricas Principales -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <!-- KPI 1: Monitoreos Realizados -->
          <div class="stat-card">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Fichas</span>
              <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
              </div>
            </div>
            <h3 id="kpi-total-monitoreos" class="text-3xl font-extrabold text-slate-900">...</h3>
            <p class="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Evaluaciones registradas</span>
            </p>
          </div>

          <!-- KPI 2: Nivel Crítico -->
          <div class="stat-card border-red-100">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-red-600">Riesgo Crítico</span>
              <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
            </div>
            <div class="flex items-baseline gap-2">
              <h3 id="kpi-criticos" class="text-3xl font-extrabold text-red-600">...</h3>
              <span id="kpi-criticos-pct" class="text-xs font-semibold text-red-500">(0%)</span>
            </div>
            <p class="text-xs text-red-500 mt-1 font-medium">Puntaje menor a 12 pts</p>
          </div>

          <!-- KPI 3: Nivel En Proceso -->
          <div class="stat-card border-amber-100">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-600">En Proceso</span>
              <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
            </div>
            <div class="flex items-baseline gap-2">
              <h3 id="kpi-proceso" class="text-3xl font-extrabold text-amber-600">...</h3>
              <span id="kpi-proceso-pct" class="text-xs font-semibold text-amber-500">(0%)</span>
            </div>
            <p class="text-xs text-amber-600 mt-1 font-medium">Puntaje de 12 a 15 pts</p>
          </div>

          <!-- KPI 4: Nivel Satisfactorio -->
          <div class="stat-card border-emerald-100">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-600">Satisfactorio</span>
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>
            <div class="flex items-baseline gap-2">
              <h3 id="kpi-satisfactorio" class="text-3xl font-extrabold text-emerald-600">...</h3>
              <span id="kpi-satisfactorio-pct" class="text-xs font-semibold text-emerald-500">(0%)</span>
            </div>
            <p class="text-xs text-emerald-600 mt-1 font-medium">Puntaje de 16 a 20 pts</p>
          </div>

        </div>

        <!-- ====================================================================
             GRÁFICOS Y RESUMEN COMPARATIVO
             ==================================================================== -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Panel 1: Distribución de la Semaforización Pedagógica -->
          <div class="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-slate-900">Distribución de Semaforización</h3>
                <span class="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  Diagnóstico Pedagógico
                </span>
              </div>
              <p class="text-xs text-slate-500 mb-6">
                Proporción de docentes evaluados según la matriz de riesgo institucional de la UGEL.
              </p>

              <!-- Barras de Distribución Visual -->
              <div class="space-y-4">
                
                <!-- Satisfactorio -->
                <div>
                  <div class="flex items-center justify-between text-xs font-semibold mb-1">
                    <span class="text-emerald-700 flex items-center gap-1.5">
                      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Satisfactorio (16 - 20 pts)
                    </span>
                    <span id="bar-label-satisfactorio" class="text-slate-700">0 (0%)</span>
                  </div>
                  <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div id="bar-satisfactorio" class="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700" style="width: 0%"></div>
                  </div>
                </div>

                <!-- En Proceso -->
                <div>
                  <div class="flex items-center justify-between text-xs font-semibold mb-1">
                    <span class="text-amber-700 flex items-center gap-1.5">
                      <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      En Proceso (12 - 15 pts)
                    </span>
                    <span id="bar-label-proceso" class="text-slate-700">0 (0%)</span>
                  </div>
                  <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div id="bar-proceso" class="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700" style="width: 0%"></div>
                  </div>
                </div>

                <!-- Crítico -->
                <div>
                  <div class="flex items-center justify-between text-xs font-semibold mb-1">
                    <span class="text-red-700 flex items-center gap-1.5">
                      <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      Crítico (&lt; 12 pts)
                    </span>
                    <span id="bar-label-critico" class="text-slate-700">0 (0%)</span>
                  </div>
                  <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div id="bar-critico" class="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700" style="width: 0%"></div>
                  </div>
                </div>

              </div>
            </div>

            <!-- Resumen Diagnóstico -->
            <div id="diagnostico-box" class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-slate-500">Estado de Acompañamiento:</span>
              <span id="diagnostico-badge" class="font-bold text-slate-700">Analizando datos...</span>
            </div>
          </div>

          <!-- Panel 2: Resumen de Asistencia a Capacitaciones -->
          <div class="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-slate-900">Efectividad de Capacitaciones</h3>
                <span class="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  Participación Docente
                </span>
              </div>
              <p class="text-xs text-slate-500 mb-6">
                Monitoreo del compromiso docente en eventos y talleres programados.
              </p>

              <!-- Métricas Circulares / Bloque de Estadísticas -->
              <div class="grid grid-cols-2 gap-4">
                
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center">
                  <div class="relative flex items-center justify-center w-20 h-20 mb-2">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path class="text-slate-200" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                      <path id="circle-progress-asistencia" class="text-blue-600 transition-all duration-1000" stroke-dasharray="0, 100" stroke-width="3.5" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                    </svg>
                    <span id="circle-pct-text" class="absolute font-extrabold text-sm text-slate-800">0%</span>
                  </div>
                  <span class="text-xs font-bold text-slate-700">Asistencia Global</span>
                </div>

                <div class="space-y-2.5 flex flex-col justify-center">
                  <div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs">
                    <span class="text-emerald-700 block font-medium">Asistencias Confirmadas:</span>
                    <strong id="asist-presentes-count" class="text-base font-bold text-emerald-800">0</strong>
                  </div>
                  <div class="p-2.5 rounded-lg bg-red-50 border border-red-100 text-xs">
                    <span class="text-red-700 block font-medium">Inasistencias Registradas:</span>
                    <strong id="asist-ausentes-count" class="text-base font-bold text-red-800">0</strong>
                  </div>
                  <div class="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs">
                    <span class="text-indigo-700 block font-medium">Talleres Realizados:</span>
                    <strong id="total-talleres-count" class="text-base font-bold text-indigo-800">0</strong>
                  </div>
                </div>

              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-slate-500">Módulo Formativo:</span>
              <a href="#/capacitaciones" class="font-semibold text-blue-600 hover:underline">Gestionar Talleres &rarr;</a>
            </div>
          </div>

        </div>

        <!-- ====================================================================
             TABLAS INFERIORES: ÚLTIMAS FICHAS Y PRÓXIMOS EVENTOS
             ==================================================================== -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Lista de Monitoreos Recientes -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-bold text-slate-900">Últimos Monitoreos Realizados</h3>
              <a href="#/monitoreo" class="text-xs font-semibold text-blue-600 hover:underline">Ver todas &rarr;</a>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="text-slate-400 font-semibold border-b border-slate-100">
                  <tr>
                    <th class="pb-2">Fecha</th>
                    <th class="pb-2">Docente</th>
                    <th class="pb-2 text-center">Puntaje</th>
                    <th class="pb-2 text-center">Semáforo</th>
                  </tr>
                </thead>
                <tbody id="tabla-fichas-recientes" class="divide-y divide-slate-50">
                  <tr>
                    <td colspan="4" class="py-6 text-center text-slate-400">Cargando fichas recientes...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Próximos Talleres / Capacitaciones -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-bold text-slate-900">Capacitaciones Programadas</h3>
              <a href="#/capacitaciones" class="text-xs font-semibold text-indigo-600 hover:underline">Ver eventos &rarr;</a>
            </div>

            <div id="lista-capacitaciones-recientes" class="space-y-3">
              <p class="text-xs text-slate-400 text-center py-6">Cargando eventos...</p>
            </div>
          </div>

        </div>

      </div>
    `;
  };

  /**
   * Actualiza dinámicamente las métricas en pantalla
   */
  const updateMetricsUI = (data) => {
    if (!data) return;

    const { fichas, capacitaciones, asistencias } = data;
    const totalFichas = fichas.length;

    // Conteo de Semáforos
    let criticos = 0;
    let proceso = 0;
    let satisfactorio = 0;

    fichas.forEach(f => {
      if (f.nivel_riesgo === 'Crítico') criticos++;
      else if (f.nivel_riesgo === 'En Proceso') proceso++;
      else if (f.nivel_riesgo === 'Satisfactorio') satisfactorio++;
    });

    const pctCritico = totalFichas > 0 ? Math.round((criticos / totalFichas) * 100) : 0;
    const pctProceso = totalFichas > 0 ? Math.round((proceso / totalFichas) * 100) : 0;
    const pctSatisfactorio = totalFichas > 0 ? Math.round((satisfactorio / totalFichas) * 100) : 0;

    // 1. KPI Cards
    const elTotal = document.getElementById('kpi-total-monitoreos');
    const elCriticos = document.getElementById('kpi-criticos');
    const elCriticosPct = document.getElementById('kpi-criticos-pct');
    const elProceso = document.getElementById('kpi-proceso');
    const elProcesoPct = document.getElementById('kpi-proceso-pct');
    const elSatisfactorio = document.getElementById('kpi-satisfactorio');
    const elSatisfactorioPct = document.getElementById('kpi-satisfactorio-pct');

    if (elTotal) elTotal.textContent = totalFichas;
    if (elCriticos) elCriticos.textContent = criticos;
    if (elCriticosPct) elCriticosPct.textContent = `(${pctCritico}%)`;
    if (elProceso) elProceso.textContent = proceso;
    if (elProcesoPct) elProcesoPct.textContent = `(${pctProceso}%)`;
    if (elSatisfactorio) elSatisfactorio.textContent = satisfactorio;
    if (elSatisfactorioPct) elSatisfactorioPct.textContent = `(${pctSatisfactorio}%)`;

    // 2. Barras de Distribución
    const barSat = document.getElementById('bar-satisfactorio');
    const barProc = document.getElementById('bar-proceso');
    const barCrit = document.getElementById('bar-critico');
    const lblSat = document.getElementById('bar-label-satisfactorio');
    const lblProc = document.getElementById('bar-label-proceso');
    const lblCrit = document.getElementById('bar-label-critico');

    if (barSat) barSat.style.width = `${pctSatisfactorio}%`;
    if (barProc) barProc.style.width = `${pctProceso}%`;
    if (barCrit) barCrit.style.width = `${pctCritico}%`;

    if (lblSat) lblSat.textContent = `${satisfactorio} (${pctSatisfactorio}%)`;
    if (lblProc) lblProc.textContent = `${proceso} (${pctProceso}%)`;
    if (lblCrit) lblCrit.textContent = `${criticos} (${pctCritico}%)`;

    // Diagnóstico
    const diagBadge = document.getElementById('diagnostico-badge');
    if (diagBadge) {
      if (totalFichas === 0) {
        diagBadge.innerHTML = `<span class="text-slate-400 font-normal">Sin monitoreos aún</span>`;
      } else if (pctCritico > 40) {
        diagBadge.innerHTML = `<span class="text-red-600 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span> Alerta: Alto Riesgo Docente</span>`;
      } else if (pctSatisfactorio > 60) {
        diagBadge.innerHTML = `<span class="text-emerald-600 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Rendimiento Favorable</span>`;
      } else {
        diagBadge.innerHTML = `<span class="text-amber-600 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Acompañamiento en Proceso</span>`;
      }
    }

    // 3. Asistencias a Capacitaciones
    let presentes = 0;
    let ausentes = 0;
    asistencias.forEach(a => {
      if (a.asistio) presentes++;
      else ausentes++;
    });

    const totalAsistenciasRegistradas = asistencias.length;
    const pctAsistenciaGlobal = totalAsistenciasRegistradas > 0 ? Math.round((presentes / totalAsistenciasRegistradas) * 100) : 0;

    const elCirculo = document.getElementById('circle-progress-asistencia');
    const elCirculoTxt = document.getElementById('circle-pct-text');
    const elPresentesCount = document.getElementById('asist-presentes-count');
    const elAusentesCount = document.getElementById('asist-ausentes-count');
    const elTotalTalleres = document.getElementById('total-talleres-count');

    if (elCirculo) elCirculo.setAttribute('stroke-dasharray', `${pctAsistenciaGlobal}, 100`);
    if (elCirculoTxt) elCirculoTxt.textContent = `${pctAsistenciaGlobal}%`;
    if (elPresentesCount) elPresentesCount.textContent = presentes;
    if (elAusentesCount) elAusentesCount.textContent = ausentes;
    if (elTotalTalleres) elTotalTalleres.textContent = capacitaciones.length;

    // 4. Tabla Fichas Recientes (Top 5)
    const tbodyRecientes = document.getElementById('tabla-fichas-recientes');
    if (tbodyRecientes) {
      if (fichas.length === 0) {
        tbodyRecientes.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-400">No hay fichas registradas aún.</td></tr>`;
      } else {
        tbodyRecientes.innerHTML = fichas.slice(0, 5).map(f => {
          const docName = f.docentes ? `${f.docentes.apellido_paterno} ${f.docentes.nombres}` : 'Docente';
          let badge = 'badge-satisfactorio';
          if (f.nivel_riesgo === 'Crítico') badge = 'badge-critico';
          else if (f.nivel_riesgo === 'En Proceso') badge = 'badge-proceso';

          return `
            <tr class="hover:bg-slate-50">
              <td class="py-2.5 font-medium text-slate-600 whitespace-nowrap">${f.fecha_evaluacion}</td>
              <td class="py-2.5">
                <span class="font-bold text-slate-800 block truncate max-w-[140px]">${docName}</span>
                <span class="text-[10px] text-slate-400 truncate block max-w-[140px]">${f.instituciones_educativas?.nombre_ie || ''}</span>
              </td>
              <td class="py-2.5 text-center font-bold text-slate-800">${f.puntaje_total}</td>
              <td class="py-2.5 text-center">
                <span class="badge-semaforo ${badge} text-[10px] px-2 py-0.5">${f.nivel_riesgo}</span>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 5. Lista de Capacitaciones Recientes (Top 3)
    const listaCap = document.getElementById('lista-capacitaciones-recientes');
    if (listaCap) {
      if (capacitaciones.length === 0) {
        listaCap.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">No hay capacitaciones programadas.</p>`;
      } else {
        listaCap.innerHTML = capacitaciones.slice(0, 3).map(c => `
          <div class="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors bg-slate-50/60 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <span class="text-[10px] font-bold uppercase tracking-wider ${c.modalidad === 'Virtual' ? 'text-purple-600' : 'text-emerald-600'}">
                ${c.modalidad} &bull; ${c.horas_academicas} hrs
              </span>
              <h5 class="text-xs font-bold text-slate-800 truncate">${c.nombre_tema}</h5>
              <p class="text-[11px] text-slate-500 truncate">Ponente: ${c.ponente || 'Por asignar'}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="text-[11px] font-semibold text-slate-600 block">${c.fecha_inicio}</span>
              <a href="#/capacitaciones" class="text-[11px] font-bold text-blue-600 hover:underline">Asistencia</a>
            </div>
          </div>
        `).join('');
      }
    }
  };

  /**
   * Inicializa la vista y consulta los datos en vivo
   */
  const init = async () => {
    // Configurar botón de refresco
    document.getElementById('btn-refresh-dashboard')?.addEventListener('click', async () => {
      window.SIMAP?.Notification?.info('Actualizando métricas del sistema...');
      const data = await fetchDashboardData();
      updateMetricsUI(data);
      window.SIMAP?.Notification?.success('¡Datos actualizados!');
    });

    // Cargar datos
    const data = await fetchDashboardData();
    updateMetricsUI(data);
  };

  return {
    render,
    init,
    fetchDashboardData
  };
})();

window.SIMAP = window.SIMAP || {};
window.SIMAP.Dashboard = DashboardModule;
