-- ============================================
-- TRIGGER AUTOMÁTICO PARA CREAR USUARIOS
-- ============================================
-- Este trigger crea automáticamente un registro en public.usuarios
-- cuando se crea un usuario en auth.users
-- Esto soluciona el problema de que los usuarios no se registren

-- ============================================
-- FUNCIÓN DEL TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar en la tabla usuarios usando los metadatos del usuario
  INSERT INTO public.usuarios (
    id,
    nombre,
    apellido,
    rol,
    esta_activo,
    fecha_creacion,
    fecha_modificacion
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente'),
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREAR EL TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- IMPORTANTE: Actualizar política RLS
-- ============================================
-- Ahora que el trigger crea el usuario automáticamente,
-- podemos simplificar la política de INSERT

DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;

-- Permitir INSERT solo para el sistema (trigger) y admins
CREATE POLICY "usuarios_insert_policy" ON public.usuarios
  FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    (auth.jwt()->>'rol')::text = 'admin'
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para probar:
-- 1. Registra un nuevo usuario desde /register
-- 2. Verifica que aparezca automáticamente en la tabla usuarios:
-- SELECT * FROM usuarios ORDER BY fecha_creacion DESC LIMIT 5;

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger que crea automáticamente un registro en usuarios cuando se crea un usuario en auth.users';
