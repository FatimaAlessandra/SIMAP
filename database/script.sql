-- ==============================================================================
-- 1. CREACIÓN DE ENUMS (Dominios de datos fijos para validación)
-- ==============================================================================
CREATE TYPE tipo_riesgo AS ENUM ('Crítico', 'En Proceso', 'Satisfactorio');
CREATE TYPE tipo_sexo AS ENUM ('MASCULINO', 'FEMENINO');

-- ==============================================================================
-- 2. CREACIÓN DE TABLAS MAESTRAS (Catálogos)
-- ==============================================================================

-- Tabla de Roles
CREATE TABLE roles (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) UNIQUE NOT NULL
);

-- Tabla de Usuarios (Se vincula con auth.users de Supabase)
CREATE TABLE usuarios (
    id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- En Supabase idealmente mapea a auth.uid()
    id_rol INT REFERENCES roles(id_rol),
    email VARCHAR(100) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Instituciones Educativas
CREATE TABLE instituciones_educativas (
    id_ie UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cod_modular VARCHAR(10) UNIQUE NOT NULL,
    nombre_ie VARCHAR(150) NOT NULL,
    distrito VARCHAR(50) NOT NULL, -- Ej: Chepén, Pacanga, Pueblo Nuevo
    nivel_educativo VARCHAR(50) NOT NULL -- Ej: Secundaria, Primaria, Inicial
);

-- Tabla de Docentes (Basado exactamente en el Excel de la UGEL)
CREATE TABLE docentes (
    id_docente UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_ie UUID REFERENCES instituciones_educativas(id_ie) ON DELETE SET NULL,
    dni VARCHAR(8) UNIQUE, -- Puede ser null si el Excel no lo tiene en algunos casos
    nombres VARCHAR(100),
    apellido_paterno VARCHAR(100),
    apellido_materno VARCHAR(100),
    sexo tipo_sexo,
    especialidad VARCHAR(150), -- Permitimos nulos porque el Excel tenía 1191 vacíos
    cargo VARCHAR(100) NOT NULL,
    jornada INT NOT NULL, -- Horas, ej: 30
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 3. CREACIÓN DE TABLAS TRANSACCIONALES
-- ==============================================================================

-- Tabla de Fichas de Monitoreo
CREATE TABLE fichas_monitoreo (
    id_ficha UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID REFERENCES usuarios(id_usuario) NOT NULL, -- El Especialista que evaluó
    id_docente UUID REFERENCES docentes(id_docente) NOT NULL,
    id_ie UUID REFERENCES instituciones_educativas(id_ie) NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    puntaje_total INT NOT NULL,
    nivel_riesgo tipo_riesgo, -- Calculado automáticamente
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Auditoría (Logs)
CREATE TABLE audit_logs (
    id_log UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID REFERENCES usuarios(id_usuario),
    accion TEXT NOT NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 4. MOTOR DE REGLAS (Función RPC - Stored Procedure)
-- ==============================================================================
-- Esta función recibe los datos, calcula el semáforo y guarda la auditoría
-- todo en una sola transacción segura.

CREATE OR REPLACE FUNCTION registrar_ficha_y_auditar(
    p_id_usuario UUID,
    p_id_docente UUID,
    p_id_ie UUID,
    p_fecha DATE,
    p_puntaje INT,
    p_obs TEXT
) RETURNS UUID AS $$
DECLARE
    v_nivel_riesgo tipo_riesgo;
    v_nueva_ficha_id UUID;
BEGIN
    -- 1. Lógica del algoritmo de Semaforización (Puedes ajustar los rangos)
    IF p_puntaje < 12 THEN
        v_nivel_riesgo := 'Crítico';
    ELSIF p_puntaje >= 12 AND p_puntaje < 16 THEN
        v_nivel_riesgo := 'En Proceso';
    ELSE
        v_nivel_riesgo := 'Satisfactorio';
    END IF;

    -- 2. Insertar la nueva ficha de monitoreo
    INSERT INTO fichas_monitoreo (id_usuario, id_docente, id_ie, fecha_evaluacion, puntaje_total, nivel_riesgo, observaciones)
    VALUES (p_id_usuario, p_id_docente, p_id_ie, p_fecha, p_puntaje, v_nivel_riesgo, p_obs)
    RETURNING id_ficha INTO v_nueva_ficha_id;

    -- 3. Insertar el log de auditoría automáticamente
    INSERT INTO audit_logs (id_usuario, accion)
    VALUES (p_id_usuario, 'Registró ficha de monitoreo para docente ' || p_id_docente || ' con nivel ' || v_nivel_riesgo);

    -- 4. Retornar el ID de la ficha creada
    RETURN v_nueva_ficha_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 5. MÓDULO DE CAPACITACIONES Y EVENTOS (Requerimiento de Auditoría)
-- ==============================================================================

-- Tabla principal de Capacitaciones
CREATE TABLE capacitaciones (
    id_capacitacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_tema VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    horas_academicas INT NOT NULL,
    modalidad VARCHAR(50) DEFAULT 'Presencial', -- Ej: Presencial, Virtual, Híbrida
    ponente VARCHAR(150), -- Quién dictó la capacitación
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Asistencia (Relación entre Docentes y Capacitaciones)
CREATE TABLE asistencia_capacitaciones (
    id_asistencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_capacitacion UUID REFERENCES capacitaciones(id_capacitacion) ON DELETE CASCADE,
    id_docente UUID REFERENCES docentes(id_docente) ON DELETE CASCADE,
    id_usuario UUID REFERENCES usuarios(id_usuario), -- El especialista que registró la asistencia
    asistio BOOLEAN DEFAULT FALSE,
    observaciones VARCHAR(255),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Esta regla evita que se registre por error al mismo docente dos veces en el mismo evento
    UNIQUE(id_capacitacion, id_docente) 
);