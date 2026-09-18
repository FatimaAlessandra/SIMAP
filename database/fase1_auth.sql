-- ==============================================================================
-- SIMAP - FASE 1: Tablas Maestras de Autenticación, Roles y Trigger de Usuarios
-- Ejecutar este script en el Editor SQL de tu proyecto Supabase
-- ==============================================================================

-- 1. Tabla de Roles del Sistema
CREATE TABLE IF NOT EXISTS roles (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) UNIQUE NOT NULL
);

-- Poblar roles base si no existen
INSERT INTO roles (nombre_rol) VALUES 
('Administrador'),
('Especialista'),
('Directivo')
ON CONFLICT (nombre_rol) DO NOTHING;

-- 2. Tabla de Perfiles de Usuario (Vinculada a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    id_rol INT REFERENCES roles(id_rol) DEFAULT 2, -- Por defecto 'Especialista'
    email VARCHAR(100) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (Seguridad por filas)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS para roles y usuarios
-- Permitir lectura de roles a usuarios autenticados
DROP POLICY IF EXISTS "Permitir lectura de roles a autenticados" ON roles;
CREATE POLICY "Permitir lectura de roles a autenticados" 
ON roles FOR SELECT TO authenticated USING (true);

-- Permitir a usuarios autenticados leer su propio perfil y el de otros miembros
DROP POLICY IF EXISTS "Usuarios pueden ver perfiles" ON usuarios;
CREATE POLICY "Usuarios pueden ver perfiles" 
ON usuarios FOR SELECT TO authenticated USING (true);

-- Permitir a los usuarios actualizar únicamente su propio perfil
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON usuarios;
CREATE POLICY "Usuarios pueden actualizar su propio perfil" 
ON usuarios FOR UPDATE TO authenticated USING (auth.uid() = id_usuario);

-- 4. Trigger automático: Cuando se crea un usuario en Supabase Auth, se crea su perfil en public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_default_rol_id INT;
BEGIN
    SELECT id_rol INTO v_default_rol_id FROM public.roles WHERE nombre_rol = 'Especialista' LIMIT 1;

    INSERT INTO public.usuarios (id_usuario, id_rol, email, nombres)
    VALUES (
        NEW.id,
        COALESCE(v_default_rol_id, 2),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombres', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id_usuario) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Nota: Para crear tu primer usuario, puedes ir al menú 'Authentication > Users' en Supabase 
-- y hacer clic en 'Add user' con email y contraseña. El trigger creará automáticamente el registro en public.usuarios.
