-- ==============================================================================
-- SIMAP - FASE 4: Módulo de Capacitaciones y Asistencia Docente
-- Ejecutar este script en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Tabla Principal de Capacitaciones
CREATE TABLE IF NOT EXISTS capacitaciones (
    id_capacitacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_tema VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    horas_academicas INT NOT NULL DEFAULT 4,
    modalidad VARCHAR(50) DEFAULT 'Presencial', -- Presencial, Virtual, Híbrida
    ponente VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Asistencia a Capacitaciones
CREATE TABLE IF NOT EXISTS asistencia_capacitaciones (
    id_asistencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_capacitacion UUID REFERENCES capacitaciones(id_capacitacion) ON DELETE CASCADE NOT NULL,
    id_docente UUID REFERENCES docentes(id_docente) ON DELETE CASCADE NOT NULL,
    id_usuario UUID REFERENCES usuarios(id_usuario), -- Especialista que registra
    asistio BOOLEAN DEFAULT FALSE,
    observaciones VARCHAR(255),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Evita duplicados: un docente solo tiene un estado de asistencia por capacitación
    CONSTRAINT uq_capacitacion_docente UNIQUE (id_capacitacion, id_docente)
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia_capacitaciones ENABLE ROW LEVEL SECURITY;

-- Políticas para capacitaciones
DROP POLICY IF EXISTS "Permitir lectura de capacitaciones a autenticados" ON capacitaciones;
CREATE POLICY "Permitir lectura de capacitaciones a autenticados" 
ON capacitaciones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir insertar capacitaciones a autenticados" ON capacitaciones;
CREATE POLICY "Permitir insertar capacitaciones a autenticados" 
ON capacitaciones FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizar capacitaciones a autenticados" ON capacitaciones;
CREATE POLICY "Permitir actualizar capacitaciones a autenticados" 
ON capacitaciones FOR UPDATE TO authenticated USING (true);

-- Políticas para asistencia_capacitaciones
DROP POLICY IF EXISTS "Permitir lectura de asistencias a autenticados" ON asistencia_capacitaciones;
CREATE POLICY "Permitir lectura de asistencias a autenticados" 
ON asistencia_capacitaciones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir insertar asistencias a autenticados" ON asistencia_capacitaciones;
CREATE POLICY "Permitir insertar asistencias a autenticados" 
ON asistencia_capacitaciones FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizar asistencias a autenticados" ON asistencia_capacitaciones;
CREATE POLICY "Permitir actualizar asistencias a autenticados" 
ON asistencia_capacitaciones FOR UPDATE TO authenticated USING (true);

-- 4. Datos Semilla de Capacitación de Ejemplo (Opcional para pruebas inmediatas)
INSERT INTO capacitaciones (nombre_tema, descripcion, fecha_inicio, fecha_fin, horas_academicas, modalidad, ponente)
VALUES 
    (
        'Estrategias de Evaluación Formativa y Retroalimentación Pedagógica', 
        'Taller presencial enfocado en instrumentos de evaluación auténtica y rúbricas de desempeño según lineamientos CNEB.', 
        CURRENT_DATE, 
        CURRENT_DATE, 
        6, 
        'Presencial', 
        'Dra. Carmen Rosa Mendoza (Especialista MINEDU)'
    ),
    (
        'Integración de Herramientas Digitales en el Aula de Secundaria', 
        'Capacitación teórico-práctica para el diseño de sesiones interactivas con recursos TIC.', 
        CURRENT_DATE + 3, 
        CURRENT_DATE + 4, 
        8, 
        'Virtual', 
        'Mg. Roberto Silva Paz'
    )
ON CONFLICT DO NOTHING;
