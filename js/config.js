/**
 * SIMAP - Configuración e Inicialización de Supabase (Patrón Módulo)
 * 
 * INSTRUCCIONES:
 * Reemplaza los valores de SUPABASE_URL y SUPABASE_ANON_KEY con las credenciales
 * de tu proyecto Supabase (en Project Settings > API).
 */

const ConfigModule = (() => {
  // === CONFIGURACIÓN DE SUPABASE ===
  const SUPABASE_URL = 'https://cbnpxgwrswjlrxnlkpal.supabase.co'; // <- Coloca aquí tu URL de Supabase
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibnB4Z3dyc3dqbHJ4bmxrcGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTU0MTcsImV4cCI6MjEwNTI3MTQxN30.q1N8VA-OgB0onl4dOn4AyF4KskUgGA7eyXOrz-no5Hg';       // <- Coloca aquí tu anon/public key

  let client = null;

  const isConfigured = () => {
    return (
      SUPABASE_URL &&
      !SUPABASE_URL.includes('TU_PROYECTO') &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_ANON_KEY.includes('TU_SUPABASE_ANON_KEY')
    );
  };

  const init = () => {
    if (!window.supabase) {
      console.error('❌ [SIMAP] La librería de Supabase JS no se cargó correctamente.');
      return null;
    }

    if (!isConfigured()) {
      console.warn('⚠️ [SIMAP] Supabase no está configurado aún. Por favor edita js/config.js con tu URL y ANON KEY.');
    }

    try {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      console.log('✅ [SIMAP] Cliente Supabase inicializado.');
    } catch (error) {
      console.error('❌ [SIMAP] Error al inicializar cliente Supabase:', error);
    }

    return client;
  };

  const getClient = () => {
    if (!client) {
      return init();
    }
    return client;
  };

  return {
    init,
    getClient,
    isConfigured,
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  };
})();

// Espacio de nombres global para la aplicación
window.SIMAP = window.SIMAP || {};
window.SIMAP.Config = ConfigModule;
window.SIMAP.supabase = ConfigModule.getClient();
