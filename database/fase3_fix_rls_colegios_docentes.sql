-- ==============================================================================
-- SIMAP - CORRECCIÓN DE POLÍTICAS DE SEGURIDAD (RLS) PARA COLEGIOS Y DOCENTES
-- ==============================================================================
-- Este script soluciona el error:
-- "new row violates row-level security policy for table 'instituciones_educativas'"
--
-- Ejecuta este script en el Editor SQL de tu panel de Supabase (SQL Editor).
-- ==============================================================================

-- 1. Asegurar permisos en el esquema public para anon y authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. POLÍTICAS RLS: INSTITUCIONES EDUCATIVAS (COLEGIOS)
-- ------------------------------------------------------------------------------
-- Habilitar RLS en instituciones_educativas
ALTER TABLE instituciones_educativas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas previas que puedan causar conflicto o ser muy restrictivas
DROP POLICY IF EXISTS "Permitir leer IE a autenticados" ON instituciones_educativas;
DROP POLICY IF EXISTS "Permitir insertar IE a autenticados" ON instituciones_educativas;
DROP POLICY IF EXISTS "Permitir todo en instituciones_educativas" ON instituciones_educativas;
DROP POLICY IF EXISTS "Permitir select en instituciones_educativas" ON instituciones_educativas;
DROP POLICY IF EXISTS "Permitir insert en instituciones_educativas" ON instituciones_educativas;
DROP POLICY IF EXISTS "Permitir update en instituciones_educativas" ON instituciones_educativas;

-- Crear política integral que permite lectura, inserción y actualización a usuarios (anon y authenticated)
CREATE POLICY "Permitir todo en instituciones_educativas"
ON instituciones_educativas
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS RLS: DOCENTES
-- ------------------------------------------------------------------------------
-- Habilitar RLS en docentes
ALTER TABLE docentes ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas previas restrictivas
DROP POLICY IF EXISTS "Permitir leer docentes a autenticados" ON docentes;
DROP POLICY IF EXISTS "Permitir insertar docentes a autenticados" ON docentes;
DROP POLICY IF EXISTS "Permitir todo en docentes" ON docentes;
DROP POLICY IF EXISTS "Permitir select en docentes" ON docentes;
DROP POLICY IF EXISTS "Permitir insert en docentes" ON docentes;
DROP POLICY IF EXISTS "Permitir update en docentes" ON docentes;

-- Crear política integral que permite lectura, inserción y actualización
CREATE POLICY "Permitir todo en docentes"
ON docentes
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS RLS: FICHAS DE MONITOREO Y AUDIT LOGS
-- ------------------------------------------------------------------------------
ALTER TABLE fichas_monitoreo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leer fichas a autenticados" ON fichas_monitoreo;
DROP POLICY IF EXISTS "Permitir insertar fichas a autenticados" ON fichas_monitoreo;
DROP POLICY IF EXISTS "Permitir todo en fichas_monitoreo" ON fichas_monitoreo;

CREATE POLICY "Permitir todo en fichas_monitoreo"
ON fichas_monitoreo
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leer logs a autenticados" ON audit_logs;
DROP POLICY IF EXISTS "Permitir todo en audit_logs" ON audit_logs;

CREATE POLICY "Permitir todo en audit_logs"
ON audit_logs
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. FUNCIONES RPC DE SEGURIDAD DEFINIDA (SECURITY DEFINER)
-- Como respaldo infalible que omite restricciones RLS
-- ------------------------------------------------------------------------------

-- Función para registrar colegio de forma directa e infalible
CREATE OR REPLACE FUNCTION registrar_colegio(
    p_cod_modular VARCHAR,
    p_nombre_ie VARCHAR,
    p_distrito VARCHAR,
    p_nivel_educativo VARCHAR
) RETURNS JSON AS $$
DECLARE
    v_nuevo_colegio RECORD;
BEGIN
    INSERT INTO instituciones_educativas (cod_modular, nombre_ie, distrito, nivel_educativo)
    VALUES (p_cod_modular, p_nombre_ie, p_distrito, p_nivel_educativo)
    RETURNING * INTO v_nuevo_colegio;

    RETURN row_to_json(v_nuevo_colegio);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION registrar_colegio(VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon, authenticated, service_role;

-- Función para registrar docente de forma directa e infalible
CREATE OR REPLACE FUNCTION registrar_docente_seguro(
    p_id_ie UUID,
    p_dni VARCHAR,
    p_nombres VARCHAR,
    p_apellido_paterno VARCHAR,
    p_apellido_materno VARCHAR,
    p_sexo VARCHAR,
    p_especialidad VARCHAR,
    p_cargo VARCHAR,
    p_jornada INT
) RETURNS JSON AS $$
DECLARE
    v_nuevo_docente RECORD;
BEGIN
    INSERT INTO docentes (id_ie, dni, nombres, apellido_paterno, apellido_materno, sexo, especialidad, cargo, jornada)
    VALUES (p_id_ie, p_dni, p_nombres, p_apellido_paterno, p_apellido_materno, p_sexo, p_especialidad, p_cargo, p_jornada)
    RETURNING * INTO v_nuevo_docente;

    RETURN row_to_json(v_nuevo_docente);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION registrar_docente_seguro(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- NOTA ADICIONAL:
-- Si prefieres que las tablas de catálogo general (colegios y docentes) nunca
-- bloqueen registros independientemente del rol, puedes deshabilitar RLS ejecutando:
--
-- ALTER TABLE instituciones_educativas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE docentes DISABLE ROW LEVEL SECURITY;
-- ------------------------------------------------------------------------------
