-- ==============================================================================
-- SIMAP - ACTUALIZACIÓN: Registro del Profesor Evaluador en Fichas de Monitoreo
-- Ejecutar en el Editor SQL de Supabase (SQL Editor)
-- ==============================================================================

-- 1. Agregar columnas para el profesor evaluador en fichas_monitoreo
ALTER TABLE fichas_monitoreo
ADD COLUMN IF NOT EXISTS id_docente_evaluador UUID REFERENCES docentes(id_docente) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS evaluador VARCHAR(200);

-- 2. Actualizar la función RPC para recibir y registrar al profesor evaluador
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
    p_nro_monitoreo VARCHAR DEFAULT 'I',
    p_evaluador VARCHAR DEFAULT NULL,
    p_id_docente_evaluador UUID DEFAULT NULL
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

    -- Validar escala (5 a 20 pts)
    IF v_puntaje_calculado < 0 OR v_puntaje_calculado > 20 THEN
        RAISE EXCEPTION 'El puntaje acumulado de las rúbricas debe estar comprendido entre 0 y 20 puntos.';
    END IF;

    -- Algoritmo de Semaforización Oficial MINEDU
    IF v_puntaje_calculado < 12 THEN
        v_nivel_riesgo := 'Crítico';
    ELSIF v_puntaje_calculado >= 12 AND v_puntaje_calculado < 16 THEN
        v_nivel_riesgo := 'En Proceso';
    ELSE
        v_nivel_riesgo := 'Satisfactorio';
    END IF;

    -- Insertar la ficha con evaluador y rúbricas
    INSERT INTO fichas_monitoreo (
        id_usuario, id_docente, id_ie, fecha_evaluacion, puntaje_total, nivel_riesgo, observaciones,
        nro_monitoreo, rubrica_1, rubrica_2, rubrica_3, rubrica_4, rubrica_5,
        evaluador, id_docente_evaluador
    )
    VALUES (
        p_id_usuario, p_id_docente, p_id_ie, p_fecha, v_puntaje_calculado, v_nivel_riesgo, p_obs,
        COALESCE(p_nro_monitoreo, 'I'), p_r1, p_r2, p_r3, p_r4, p_r5,
        COALESCE(p_evaluador, 'Especialista de Monitoreo'), p_id_docente_evaluador
    )
    RETURNING id_ficha INTO v_nueva_ficha_id;

    -- Obtener nombre del docente evaluado
    SELECT nombres || ' ' || apellido_paterno INTO v_nombre_docente 
    FROM docentes WHERE id_docente = p_id_docente;

    -- Registrar en log de auditoría
    INSERT INTO audit_logs (id_usuario, accion)
    VALUES (
        p_id_usuario, 
        'Registró ' || COALESCE(p_nro_monitoreo, 'I') || ' Monitoreo para el docente ' || COALESCE(v_nombre_docente, 'Desconocido') || 
        ' (Evaluador: ' || COALESCE(p_evaluador, 'Especialista') || ') con semáforo: ' || v_nivel_riesgo || ' (' || v_puntaje_calculado || ' pts)'
    );

    v_result := json_build_object(
        'id_ficha', v_nueva_ficha_id,
        'nivel_riesgo', v_nivel_riesgo,
        'puntaje', v_puntaje_calculado,
        'nro_monitoreo', p_nro_monitoreo,
        'evaluador', p_evaluador
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permiso de ejecución para usuarios autenticados
GRANT EXECUTE ON FUNCTION registrar_ficha_y_auditar(UUID, UUID, UUID, DATE, INT, TEXT, INT, INT, INT, INT, INT, VARCHAR, VARCHAR, UUID) TO authenticated;
