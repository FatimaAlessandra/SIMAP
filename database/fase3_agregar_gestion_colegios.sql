-- ====================================================================
-- SIMAP - MIGRACIÓN: AGREGAR TIPO DE GESTIÓN (PÚBLICA / PRIVADA)
-- Ejecutar este script en Supabase SQL Editor
-- ====================================================================

-- 1. Agregar columna tipo_gestion a instituciones_educativas
ALTER TABLE instituciones_educativas 
ADD COLUMN IF NOT EXISTS tipo_gestion VARCHAR(20) DEFAULT 'Pública';

-- 2. Asegurar que los registros actuales tengan un valor válido
UPDATE instituciones_educativas 
SET tipo_gestion = 'Pública' 
WHERE tipo_gestion IS NULL;

-- 3. Eliminar versiones anteriores de las funciones RPC para evitar colisiones de firma
DROP FUNCTION IF EXISTS registrar_colegio(VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS actualizar_colegio(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

-- 4. Crear función registrar_colegio con parámetro tipo_gestion
CREATE OR REPLACE FUNCTION registrar_colegio(
    p_cod_modular VARCHAR,
    p_nombre_ie VARCHAR,
    p_distrito VARCHAR,
    p_nivel_educativo VARCHAR,
    p_tipo_gestion VARCHAR DEFAULT 'Pública'
) RETURNS JSON AS $$
DECLARE
    v_nuevo_colegio RECORD;
BEGIN
    INSERT INTO instituciones_educativas (cod_modular, nombre_ie, distrito, nivel_educativo, tipo_gestion)
    VALUES (p_cod_modular, p_nombre_ie, p_distrito, p_nivel_educativo, COALESCE(p_tipo_gestion, 'Pública'))
    RETURNING * INTO v_nuevo_colegio;

    RETURN row_to_json(v_nuevo_colegio);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION registrar_colegio(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon, authenticated, service_role;

-- 5. Crear función actualizar_colegio con parámetro tipo_gestion
CREATE OR REPLACE FUNCTION actualizar_colegio(
    p_id_ie UUID,
    p_cod_modular VARCHAR,
    p_nombre_ie VARCHAR,
    p_distrito VARCHAR,
    p_nivel_educativo VARCHAR,
    p_tipo_gestion VARCHAR DEFAULT 'Pública'
) RETURNS JSON AS $$
DECLARE
    v_colegio RECORD;
BEGIN
    UPDATE instituciones_educativas
    SET cod_modular = p_cod_modular,
        nombre_ie = p_nombre_ie,
        distrito = p_distrito,
        nivel_educativo = p_nivel_educativo,
        tipo_gestion = COALESCE(p_tipo_gestion, 'Pública')
    WHERE id_ie = p_id_ie
    RETURNING * INTO v_colegio;

    RETURN row_to_json(v_colegio);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION actualizar_colegio(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon, authenticated, service_role;
