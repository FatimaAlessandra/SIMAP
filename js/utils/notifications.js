/**
 * SIMAP - Notification Utility (Patrón Módulo)
 * Sistema de alertas flotantes (Toasts) elegantes y no intrusivas
 */
const NotificationModule = (() => {
  let container = null;

  const getContainer = () => {
    if (!container) {
      container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
      }
    }
    return container;
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return `<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px;color:#10b981"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      case 'error':
        return `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px;color:#ef4444"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      case 'warning':
        return `<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px;color:#f59e0b"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
      default:
        return `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px;color:#3b82f6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }
  };

  /**
   * Muestra un toast
   * @param {string} message Texto del mensaje
   * @param {'success'|'error'|'warning'|'info'} type Tipo de notificación
   * @param {number} duration Duración en milisegundos
   */
  const show = (message, type = 'info', duration = 4000) => {
    const parent = getContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    toast.innerHTML = `
      <div style="flex-shrink:0;margin-top:2px;">
        ${getIcon(type)}
      </div>
      <div style="flex:1;font-size:0.9rem;line-height:1.4;color:#1e293b;">
        ${message}
      </div>
    `;

    parent.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-closing');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, duration);
  };

  return {
    success: (msg, dur) => show(msg, 'success', dur),
    error: (msg, dur) => show(msg, 'error', dur),
    warning: (msg, dur) => show(msg, 'warning', dur),
    info: (msg, dur) => show(msg, 'info', dur),
    show
  };
})();

window.SIMAP = window.SIMAP || {};
window.SIMAP.Notification = NotificationModule;
