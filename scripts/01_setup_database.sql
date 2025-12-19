-- ============================================
-- SETUP DATABASE - Sistema de Gestión de Incidentes
-- ============================================
-- Este script crea la tabla de usuarios y configura Row Level Security (RLS)

-- ============================================
-- 1. CREAR TABLA DE USUARIOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR NOT NULL,
  apellido VARCHAR NOT NULL,
  rol VARCHAR NOT NULL CHECK (rol IN ('admin', 'gestor', 'tecnico', 'cliente')),
  id_tecnico INTEGER REFERENCES tecnicos(id_tecnico),
  id_cliente INTEGER REFERENCES clientes(id_cliente),
  esta_activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_modificacion TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en tabla usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. POLÍTICAS DE SEGURIDAD PARA USUARIOS
-- ============================================

-- Política: Los usuarios pueden ver su propio registro
CREATE POLICY "Users can view own record" ON public.usuarios
  FOR SELECT USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio registro
CREATE POLICY "Users can update own record" ON public.usuarios
  FOR UPDATE USING (auth.uid() = id);

-- Política: Los admins pueden ver todos los registros
CREATE POLICY "Admins can view all" ON public.usuarios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Política: Permitir INSERT en registro (para el signup)
CREATE POLICY "Allow insert on signup" ON public.usuarios
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 4. TRIGGER PARA ACTUALIZAR fecha_modificacion
-- ============================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usuarios_modtime
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- ============================================
-- 5. ÍNDICES PARA MEJOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON public.usuarios(esta_activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_tecnico ON public.usuarios(id_tecnico);
CREATE INDEX IF NOT EXISTS idx_usuarios_cliente ON public.usuarios(id_cliente);

-- ============================================
-- 6. COMENTARIOS EN LA TABLA
-- ============================================

COMMENT ON TABLE public.usuarios IS 'Tabla de usuarios del sistema vinculada con Supabase Auth';
COMMENT ON COLUMN public.usuarios.id IS 'UUID del usuario desde auth.users';
COMMENT ON COLUMN public.usuarios.rol IS 'Rol del usuario: admin, gestor, tecnico, cliente';
COMMENT ON COLUMN public.usuarios.id_tecnico IS 'Referencia a la tabla tecnicos si el rol es tecnico';
COMMENT ON COLUMN public.usuarios.id_cliente IS 'Referencia a la tabla clientes si el rol es cliente';

-- ============================================
-- SCRIPT COMPLETADO
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard → SQL Editor → New query → Pega el código → Run
