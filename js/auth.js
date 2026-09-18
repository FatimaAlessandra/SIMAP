/**
 * SIMAP - Módulo de Autenticación (Patrón Módulo)
 * Gestiona el inicio de sesión, cierre de sesión, recuperación de perfil y estado de sesión.
 */

const AuthModule = (() => {
  // Helper para obtener el cliente Supabase
  const getSupabase = () => {
    return window.SIMAP?.Config?.getClient() || window.SIMAP?.supabase;
  };

  /**
   * Inicia sesión con correo electrónico y contraseña
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user: object|null, error: string|null}>}
   */
  const login = async (email, password) => {
    const supabase = getSupabase();

    if (!supabase || !window.SIMAP?.Config?.isConfigured()) {
      return { 
        user: null, 
        error: 'Debes configurar tu URL y ANON_KEY de Supabase en js/config.js antes de continuar.' 
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        let errorMsg = 'Error al iniciar sesión';
        if (error.message.includes('Invalid login credentials')) {
          errorMsg = 'Correo o contraseña incorrectos.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMsg = 'El correo electrónico no ha sido confirmado aún.';
        } else {
          errorMsg = error.message;
        }
        return { user: null, error: errorMsg };
      }

      // Obtener datos complementarios del perfil en public.usuarios
      const profile = await getUserProfile(data.user.id);

      return {
        user: {
          ...data.user,
          profile: profile
        },
        session: data.session,
        error: null
      };
    } catch (err) {
      console.error('Error inesperado en login:', err);
      return { user: null, error: 'Ocurrió un error inesperado al conectar con el servidor.' };
    }
  };

  /**
   * Cierra la sesión activa y redirige al login
   */
  const logout = async () => {
    const supabase = getSupabase();
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      localStorage.removeItem('simap_user');
      window.location.href = 'index.html';
    }
  };

  /**
   * Obtiene la sesión actual
   */
  const getSession = async () => {
    const supabase = getSupabase();
    if (!supabase) return null;
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (err) {
      console.warn('Error al obtener sesión:', err);
      return null;
    }
  };

  /**
   * Consulta los datos del usuario en la tabla public.usuarios con su rol
   * @param {string} userId UUID del usuario en Supabase
   */
  const getUserProfile = async (userId) => {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id_usuario,
          email,
          nombres,
          id_rol,
          roles ( id_rol, nombre_rol )
        `)
        .eq('id_usuario', userId)
        .maybeSingle();

      if (error) {
        console.warn('No se pudo obtener el perfil de public.usuarios:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Error consultando perfil:', err);
      return null;
    }
  };

  /**
   * Verifica la autenticación. 
   * Si está en el login y ya tiene sesión -> redirige a dashboard.html
   * Si está en el dashboard y NO tiene sesión -> redirige a index.html
   */
  const checkAuth = async ({ isLoginPage = false } = {}) => {
    const session = await getSession();

    if (isLoginPage && session) {
      // Ya está logueado, llevar al dashboard
      window.location.href = 'dashboard.html';
      return;
    }

    if (!isLoginPage && !session) {
      // No está autenticado, llevar al login
      window.location.href = 'index.html';
      return;
    }

    return session;
  };

  /**
   * Inicializa los eventos del formulario de Login en index.html
   */
  const initLoginForm = () => {
    const form = document.getElementById('login-form');
    if (!form) return;

    // Verificar si ya hay sesión activa
    checkAuth({ isLoginPage: true });

    // Alternar visibilidad de contraseña
    const togglePassBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    if (togglePassBtn && passwordInput) {
      togglePassBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePassBtn.innerHTML = isPassword 
          ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path></svg>`
          : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`;
      });
    }

    // Submit del formulario
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = document.getElementById('btn-submit');
      const originalBtnHtml = submitBtn.innerHTML;

      // Validación simple
      if (!email || !password) {
        window.SIMAP?.Notification?.warning('Por favor completa todos los campos.');
        return;
      }

      // Estado de carga
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <div class="spinner"></div>
        <span>Iniciando sesión...</span>
      `;

      try {
        const result = await login(email, password);

        if (result.error) {
          window.SIMAP?.Notification?.error(result.error);
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
          return;
        }

        window.SIMAP?.Notification?.success('¡Bienvenido a SIMAP! Redirigiendo...');
        
        // Guardar información básica de sesión local para uso rápido
        if (result.user?.profile) {
          localStorage.setItem('simap_user', JSON.stringify(result.user.profile));
        }

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1200);

      } catch (err) {
        console.error('Error al procesar formulario de login:', err);
        window.SIMAP?.Notification?.error('Ocurrió un error inesperado al iniciar sesión.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  };

  return {
    login,
    logout,
    getSession,
    getUserProfile,
    checkAuth,
    initLoginForm
  };
})();

window.SIMAP = window.SIMAP || {};
window.SIMAP.Auth = AuthModule;

// Auto-inicializar si estamos en la página con el formulario
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-form')) {
    AuthModule.initLoginForm();
  }
});
