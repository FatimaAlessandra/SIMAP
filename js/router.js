/**
 * SIMAP - Enrutador SPA en Vanilla JavaScript (Patrón Módulo)
 * Carga vistas dinámicas en el contenedor principal sin recargar la página
 */

const RouterModule = (() => {
  let contentContainer = null;
  const routes = {};

  /**
   * Registra una nueva ruta en el enrutador
   * @param {string} path Hash de la ruta (ej: '#/monitoreo')
   * @param {Function} handler Función que retorna HTML o renderiza la vista
   * @param {string} title Título descriptivo de la vista
   */
  /**
   * Registra una nueva ruta en el enrutador
   * @param {string} path Hash de la ruta (ej: '#/monitoreo')
   * @param {Function} handler Función que retorna HTML o renderiza la vista
   * @param {string} title Título descriptivo de la vista
   * @param {Function} mount Callback ejecutado tras inyectar el HTML en el DOM
   */
  const registerRoute = (path, handler, title = 'SIMAP', mount = null) => {
    routes[path] = { handler, title, mount };
  };

  /**
   * Actualiza el enlace activo en la barra lateral (Sidebar)
   * @param {string} currentHash
   */
  const updateActiveSidebarLink = (currentHash) => {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentHash || (currentHash === '#/' && href === '#/dashboard')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  };

  /**
   * Actualiza el título en el header superior
   * @param {string} title
   */
  const updateHeaderTitle = (title) => {
    const titleEl = document.getElementById('view-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
    document.title = `${title} | SIMAP`;
  };

  /**
   * Procesa y carga la vista correspondiente al hash actual
   */
  const handleRouteChange = async () => {
    if (!contentContainer) {
      contentContainer = document.getElementById('app-content');
      if (!contentContainer) return;
    }

    let hash = window.location.hash || '#/dashboard';
    if (hash === '#/' || hash === '#' || hash === '') {
      hash = '#/dashboard';
    }

    const route = routes[hash] || routes['#/dashboard'];

    if (route && typeof route.handler === 'function') {
      updateActiveSidebarLink(hash);
      updateHeaderTitle(route.title);

      // Efecto visual de transición
      contentContainer.classList.remove('view-fade-in');
      void contentContainer.offsetWidth; // Forzar reflow

      // Ejecutar el handler de la vista
      const viewHtml = await route.handler();
      if (typeof viewHtml === 'string') {
        contentContainer.innerHTML = viewHtml;
      }

      // Ejecutar el callback de montaje para enlazar eventos del módulo
      if (typeof route.mount === 'function') {
        await route.mount();
      }
      
      contentContainer.classList.add('view-fade-in');
    }
  };

  /**
   * Navega programáticamente a un hash
   * @param {string} hash
   */
  const navigateTo = (hash) => {
    window.location.hash = hash;
  };

  /**
   * Vistas por defecto para la Fase 2 (preparando Fase 3 y 4)
   */
  const initDefaultRoutes = () => {
    // 1. Vista Dashboard General (Conectada a DashboardModule de Fase 5)
    registerRoute(
      '#/dashboard', 
      () => {
        if (window.SIMAP?.Dashboard) {
          return window.SIMAP.Dashboard.render();
        }
        return '<div class="p-8 text-center text-slate-400">Cargando panel principal...</div>';
      }, 
      'Panel Principal',
      async () => {
        if (window.SIMAP?.Dashboard?.init) {
          await window.SIMAP.Dashboard.init();
        }
      }
    );

    // 2. Vista Monitoreo (Conectada a MonitoreoModule de Fase 3)
    registerRoute(
      '#/monitoreo', 
      () => {
        if (window.SIMAP?.Monitoreo) {
          return window.SIMAP.Monitoreo.render();
        }
        return '<div class="p-8 text-center text-slate-400">Cargando módulo de monitoreo...</div>';
      }, 
      'Monitoreo Pedagógico',
      async () => {
        if (window.SIMAP?.Monitoreo?.init) {
          await window.SIMAP.Monitoreo.init();
        }
      }
    );

    // 3. Vista Capacitaciones (Conectada a CapacitacionesModule de Fase 4)
    registerRoute(
      '#/capacitaciones', 
      () => {
        if (window.SIMAP?.Capacitaciones) {
          return window.SIMAP.Capacitaciones.render();
        }
        return '<div class="p-8 text-center text-slate-400">Cargando módulo de capacitaciones...</div>';
      }, 
      'Capacitaciones Docentes',
      async () => {
        if (window.SIMAP?.Capacitaciones?.init) {
          await window.SIMAP.Capacitaciones.init();
        }
      }
    );
  };

  /**
   * Inicializa el enrutador
   */
  const init = () => {
    contentContainer = document.getElementById('app-content');
    initDefaultRoutes();

    // Escuchar cambios de hash en la URL
    window.addEventListener('hashchange', handleRouteChange);

    // Cargar la ruta inicial
    handleRouteChange();
  };

  return {
    init,
    registerRoute,
    navigateTo,
    handleRouteChange
  };
})();

window.SIMAP = window.SIMAP || {};
window.SIMAP.Router = RouterModule;
