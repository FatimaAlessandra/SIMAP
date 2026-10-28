-- ====================================================================
-- SIMAP - MIGRACIÓN: REEMPLAZAR JORNADA (HORAS) POR HORA DE INICIO Y FIN
-- Ejecutar este script en Supabase SQL Editor
-- ====================================================================

-- 1. Agregar columnas hora_inicio y hora_fin a la tabla docentes
ALTER TABLE docentes 
ADD COLUMN IF NOT EXISTS hora_inicio TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS hora_fin TIME DEFAULT '13:00:00';

-- 2. Modificar la columna jornada para que ya no sea obligatoria (NOT NULL)
ALTER TABLE docentes 
ALTER COLUMN jornada DROP NOT NULL;

-- 3. Actualizar docentes existentes con horario referencial si no lo tienen
UPDATE docentes 
SET hora_inicio = '08:00:00', 
    hora_fin = '13:00:00' 
WHERE hora_inicio IS NULL;

-- 4. Eliminar versión anterior de registrar_docente_seguro para evitar colisiones de firma
DROP FUNCTION IF EXISTS registrar_docente_seguro(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INT);

-- 5. Crear nueva versión de registrar_docente_seguro con soporte para horario (inicio y fin)
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
