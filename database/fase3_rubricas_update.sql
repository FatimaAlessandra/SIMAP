-- ==============================================================================
-- SIMAP - ACTUALIZACIÓN: Sistema de Monitoreo por 5 Rúbricas MINEDU
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Agregar columnas para el desglose de las 5 rúbricas y el N° de Monitoreo (I, II, III)
ALTER TABLE fichas_monitoreo
ADD COLUMN IF NOT EXISTS nro_monitoreo VARCHAR(10) DEFAULT 'I',
ADD COLUMN IF NOT EXISTS rubrica_1 INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS rubrica_2 INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS rubrica_3 INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS rubrica_4 INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS rubrica_5 INT DEFAULT 3;

-- 2. Actualizar la función RPC para soportar las 5 rúbricas de aula
CREATE OR REPLACE FUNCTION registrar_ficha_y_auditar(
    p_id_usuario UUID,
    p_id_docente UUID,
    p_id_ie UUID,
    p_fecha DATE,
    p_puntaje INT,
    p_obs TEXT,
    p_r1 INT DEFAULT 3,
    p_r2 INT DEFAULT 2,
    p_r3 INT DEFAULT 3,
    p_r4 INT DEFAULT 3,
    p_r5 INT DEFAULT 3,
    p_nro_monitoreo VARCHAR DEFAULT 'I'
) RETURNS JSON AS $$
DECLARE
    v_nivel_riesgo tipo_riesgo;
    v_nueva_ficha_id UUID;
    v_nombre_docente TEXT;
    v_puntaje_calculado INT;
    v_result JSON;
BEGIN
    -- Calcular puntaje sumando las 5 rúbricas si se proporcionan
    IF p_r1 IS NOT NULL AND p_r2 IS NOT NULL AND p_r3 IS NOT NULL AND p_r4 IS NOT NULL AND p_r5 IS NOT NULL THEN
        v_puntaje_calculado := p_r1 + p_r2 + p_r3 + p_r4 + p_r5;
    ELSE
        v_puntaje_calculado := p_puntaje;
    END IF;

    -- Validar escala (mínimo 5 pts, máximo 20 pts)
    IF v_puntaje_calculado < 0 OR v_puntaje_calculado > 20 THEN
        RAISE EXCEPTION 'El puntaje acumulado de las rúbricas debe estar comprendido entre 0 y 20 puntos.';
    END IF;

    -- Algoritmo de Semaforización Oficial
    IF v_puntaje_calculado < 12 THEN
        v_nivel_riesgo := 'Crítico';
    ELSIF v_puntaje_calculado >= 12 AND v_puntaje_calculado < 16 THEN
        v_nivel_riesgo := 'En Proceso';
    ELSE
        v_nivel_riesgo := 'Satisfactorio';
    END IF;

    -- Insertar la ficha con el desglose de cada rúbrica
    INSERT INTO fichas_monitoreo (
        id_usuario, id_docente, id_ie, fecha_evaluacion, puntaje_total, nivel_riesgo, observaciones,
        nro_monitoreo, rubrica_1, rubrica_2, rubrica_3, rubrica_4, rubrica_5
    )
    VALUES (
        p_id_usuario, p_id_docente, p_id_ie, p_fecha, v_puntaje_calculado, v_nivel_riesgo, p_obs,
        COALESCE(p_nro_monitoreo, 'I'), p_r1, p_r2, p_r3, p_r4, p_r5
    )
    RETURNING id_ficha INTO v_nueva_ficha_id;

    -- Obtener nombre del docente
    SELECT nombres || ' ' || apellido_paterno INTO v_nombre_docente 
    FROM docentes WHERE id_docente = p_id_docente;

    -- Registrar en log de auditoría
    INSERT INTO audit_logs (id_usuario, accion)
    VALUES (
        p_id_usuario, 
        'Registró ' || COALESCE(p_nro_monitoreo, 'I') || ' Monitoreo para el docente ' || COALESCE(v_nombre_docente, 'Desconocido') || 
        ' con semáforo: ' || v_nivel_riesgo || ' (' || v_puntaje_calculado || ' pts) [R1:' || p_r1 || ', R2:' || p_r2 || ', R3:' || p_r3 || ', R4:' || p_r4 || ', R5:' || p_r5 || ']'
    );

    v_result := json_build_object(
        'id_ficha', v_nueva_ficha_id,
        'nivel_riesgo', v_nivel_riesgo,
        'puntaje', v_puntaje_calculado,
        'nro_monitoreo', p_nro_monitoreo
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION registrar_ficha_y_auditar(UUID, UUID, UUID, DATE, INT, TEXT, INT, INT, INT, INT, INT, VARCHAR) TO authenticated;
