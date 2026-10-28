-- ====================================================================
-- SIMAP - SCRIPT DE RECUPERACIÓN: RESTAURAR COLUMNA JORNADA Y REFRESCAR ESQUEMA
-- Ejecutar este script en Supabase SQL Editor
-- ====================================================================

-- 1. Restaurar la columna 'jornada' en la tabla docentes si fue eliminada
ALTER TABLE docentes 
ADD COLUMN IF NOT EXISTS jornada INT DEFAULT 30;

-- 2. Asegurar que las nuevas columnas hora_inicio y hora_fin también existan
ALTER TABLE docentes 
ADD COLUMN IF NOT EXISTS hora_inicio TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS hora_fin TIME DEFAULT '13:00:00';

-- 3. Si hay docentes existentes con jornada nula, asignarles 30 por defecto
UPDATE docentes 
SET jornada = 30 
WHERE jornada IS NULL;

-- 4. Actualizar horarios referenciales en caso de que falten
UPDATE docentes 
SET hora_inicio = '08:00:00',
    hora_fin = '13:00:00'
WHERE hora_inicio IS NULL;

-- 5. Notificar a Supabase / PostgREST para recargar la caché del esquema de inmediato
-- (Esto resuelve de inmediato el error "Could not find column in the schema cache")
NOTIFY pgrst, 'reload schema';

-- 6. Eliminar versiones anteriores de la función para evitar conflictos de firmas
DROP FUNCTION IF EXISTS registrar_docente_seguro(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INT);

-- 7. Crear la función registrar_docente_seguro completa
CREATE OR REPLACE FUNCTION registrar_docente_seguro(
    p_id_ie UUID,
    p_dni VARCHAR,
    p_nombres VARCHAR,
    p_apellido_paterno VARCHAR,
    p_apellido_materno VARCHAR,
    p_sexo VARCHAR,
    p_especialidad VARCHAR,
    p_cargo VARCHAR,
    p_hora_inicio TIME DEFAULT '08:00:00',
    p_hora_fin TIME DEFAULT '13:00:00',
    p_jornada INT DEFAULT 30
) RETURNS JSON AS $$
DECLARE
    v_nuevo_docente RECORD;
BEGIN
    INSERT INTO docentes (
        id_ie, 
        dni, 
        nombres, 
        apellido_paterno, 
        apellido_materno, 
        sexo, 
        especialidad, 
        cargo, 
        hora_inicio, 
        hora_fin, 
        jornada
    )
    VALUES (
        p_id_ie, 
        p_dni, 
        p_nombres, 
        p_apellido_paterno, 
        p_apellido_materno, 
        p_sexo, 
        p_especialidad, 
        p_cargo, 
        COALESCE(p_hora_inicio, '08:00:00'::TIME), 
        COALESCE(p_hora_fin, '13:00:00'::TIME), 
        COALESCE(p_jornada, 30)
    )
    RETURNING * INTO v_nuevo_docente;

    RETURN row_to_json(v_nuevo_docente);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION registrar_docente_seguro(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TIME, TIME, INT) TO anon, authenticated, service_role;
