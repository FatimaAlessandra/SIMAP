-- ==============================================================================
-- SIMAP - FASE 3: Monitoreo, Docentes, Instituciones Educativas y Función RPC
-- Ejecutar este script en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Tipos ENUM (si no existen)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_riesgo') THEN
        CREATE TYPE tipo_riesgo AS ENUM ('Crítico', 'En Proceso', 'Satisfactorio');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_sexo') THEN
        CREATE TYPE tipo_sexo AS ENUM ('MASCULINO', 'FEMENINO');
    END IF;
END $$;

-- 2. Tabla de Instituciones Educativas (Colegios)
CREATE TABLE IF NOT EXISTS instituciones_educativas (
    id_ie UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cod_modular VARCHAR(10) UNIQUE NOT NULL,
    nombre_ie VARCHAR(150) NOT NULL,
    distrito VARCHAR(50) NOT NULL,
    nivel_educativo VARCHAR(50) NOT NULL
);

-- 3. Tabla de Docentes
CREATE TABLE IF NOT EXISTS docentes (
    id_docente UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_ie UUID REFERENCES instituciones_educativas(id_ie) ON DELETE SET NULL,
    dni VARCHAR(8) UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) NOT NULL,
    sexo tipo_sexo,
    especialidad VARCHAR(150),
    cargo VARCHAR(100) NOT NULL DEFAULT 'Profesor de Aula',
    jornada INT NOT NULL DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Fichas de Monitoreo
CREATE TABLE IF NOT EXISTS fichas_monitoreo (
    id_ficha UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID REFERENCES usuarios(id_usuario) NOT NULL,
    id_docente UUID REFERENCES docentes(id_docente) NOT NULL,
    id_ie UUID REFERENCES instituciones_educativas(id_ie) NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    puntaje_total INT NOT NULL,
    nivel_riesgo tipo_riesgo NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Auditoría (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id_log UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID REFERENCES usuarios(id_usuario),
    accion TEXT NOT NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Habilitar RLS en todas las tablas
ALTER TABLE instituciones_educativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_monitoreo ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para lectura (todos los usuarios autenticados pueden consultar datos)
DROP POLICY IF EXISTS "Permitir leer IE a autenticados" ON instituciones_educativas;
CREATE POLICY "Permitir leer IE a autenticados" ON instituciones_educativas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir insertar IE a autenticados" ON instituciones_educativas;
CREATE POLICY "Permitir insertar IE a autenticados" ON instituciones_educativas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leer docentes a autenticados" ON docentes;
CREATE POLICY "Permitir leer docentes a autenticados" ON docentes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir insertar docentes a autenticados" ON docentes;
CREATE POLICY "Permitir insertar docentes a autenticados" ON docentes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leer fichas a autenticados" ON fichas_monitoreo;
CREATE POLICY "Permitir leer fichas a autenticados" ON fichas_monitoreo FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leer logs a autenticados" ON audit_logs;
CREATE POLICY "Permitir leer logs a autenticados" ON audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir insertar fichas a autenticados" ON fichas_monitoreo;
CREATE POLICY "Permitir insertar fichas a autenticados" ON fichas_monitoreo FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Función RPC Transaccional: Calcula el riesgo y guarda ficha + auditoría
CREATE OR REPLACE FUNCTION registrar_ficha_y_auditar(
    p_id_usuario UUID,
    p_id_docente UUID,
    p_id_ie UUID,
    p_fecha DATE,
    p_puntaje INT,
    p_obs TEXT
) RETURNS JSON AS $$
DECLARE
    v_nivel_riesgo tipo_riesgo;
    v_nueva_ficha_id UUID;
    v_nombre_docente TEXT;
    v_result JSON;
BEGIN
    -- Validación de puntaje (0 a 20)
    IF p_puntaje < 0 OR p_puntaje > 20 THEN
        RAISE EXCEPTION 'El puntaje debe estar comprendido entre 0 y 20 puntos.';
    END IF;

    -- Algoritmo de Semaforización
    IF p_puntaje < 12 THEN
        v_nivel_riesgo := 'Crítico';
    ELSIF p_puntaje >= 12 AND p_puntaje < 16 THEN
        v_nivel_riesgo := 'En Proceso';
    ELSE
        v_nivel_riesgo := 'Satisfactorio';
    END IF;

    -- Insertar la Ficha de Monitoreo
    INSERT INTO fichas_monitoreo (
        id_usuario, id_docente, id_ie, fecha_evaluacion, puntaje_total, nivel_riesgo, observaciones
    )
    VALUES (
        p_id_usuario, p_id_docente, p_id_ie, p_fecha, p_puntaje, v_nivel_riesgo, p_obs
    )
    RETURNING id_ficha INTO v_nueva_ficha_id;

    -- Obtener nombre completo del docente para el log
    SELECT nombres || ' ' || apellido_paterno INTO v_nombre_docente 
    FROM docentes WHERE id_docente = p_id_docente;

    -- Registrar el log de auditoría
    INSERT INTO audit_logs (id_usuario, accion)
    VALUES (
        p_id_usuario, 
        'Registró ficha de monitoreo ID ' || v_nueva_ficha_id || ' para el docente ' || COALESCE(v_nombre_docente, 'Desconocido') || ' con semáforo: ' || v_nivel_riesgo || ' (' || p_puntaje || ' pts)'
    );

    -- Retornar resultado estructurado
    v_result := json_build_object(
        'id_ficha', v_nueva_ficha_id,
        'nivel_riesgo', v_nivel_riesgo,
        'puntaje', p_puntaje
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos de ejecución de la RPC a usuarios autenticados
GRANT EXECUTE ON FUNCTION registrar_ficha_y_auditar(UUID, UUID, UUID, DATE, INT, TEXT) TO authenticated;

-- ==============================================================================
-- 8. DATOS SEMILLA (Para pruebas inmediatas si las tablas están vacías)
-- ==============================================================================
INSERT INTO instituciones_educativas (cod_modular, nombre_ie, distrito, nivel_educativo)
VALUES 
    ('0412858', 'I.E. 81023 Carlos Gutiérrez Noriega', 'Chepén', 'Secundaria'),
    ('0201889', 'I.E. Santa Inés', 'Pueblo Nuevo', 'Primaria'),
    ('0589124', 'I.E. Aníbal S. Reyes', 'Pacanga', 'Secundaria')
ON CONFLICT (cod_modular) DO NOTHING;

-- Insertar docentes de prueba vinculados a las I.E. anteriores
DO $$
DECLARE
    v_ie_1 UUID;
    v_ie_2 UUID;
BEGIN
    SELECT id_ie INTO v_ie_1 FROM instituciones_educativas WHERE cod_modular = '0412858' LIMIT 1;
    SELECT id_ie INTO v_ie_2 FROM instituciones_educativas WHERE cod_modular = '0201889' LIMIT 1;

    IF v_ie_1 IS NOT NULL THEN
        INSERT INTO docentes (id_ie, dni, nombres, apellido_paterno, apellido_materno, sexo, especialidad, cargo, jornada)
        VALUES 
            (v_ie_1, '45892134', 'María Elena', 'Quispe', 'Flores', 'FEMENINO', 'Matemática', 'Profesor de Aula', 30),
            (v_ie_1, '70123456', 'Juan Carlos', 'García', 'Mendoza', 'MASCULINO', 'Comunicación', 'Profesor de Aula', 30)
        ON CONFLICT (dni) DO NOTHING;
    END IF;

    IF v_ie_2 IS NOT NULL THEN
        INSERT INTO docentes (id_ie, dni, nombres, apellido_paterno, apellido_materno, sexo, especialidad, cargo, jornada)
        VALUES 
            (v_ie_2, '41209876', 'Rosa Amelia', 'Torres', 'Vásquez', 'FEMENINO', 'Ciencia y Tecnología', 'Profesor de Aula', 30),
            (v_ie_2, '18903412', 'Pedro Alberto', 'Sánchez', 'Paredes', 'MASCULINO', 'Ciencias Sociales', 'Profesor de Aula', 30)
        ON CONFLICT (dni) DO NOTHING;
    END IF;
END $$;
