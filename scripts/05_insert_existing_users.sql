-- ============================================
-- INSERTAR USUARIOS EXISTENTES EN TABLA USUARIOS
-- ============================================
-- Este script inserta los usuarios que ya existen en auth.users
-- pero no están en la tabla usuarios

-- Admin
INSERT INTO public.usuarios (id, nombre, apellido, rol, esta_activo, fecha_creacion)
VALUES (
  '7739461e-ccbf-4b14-a827-c788eb12c347',
  'Administrador',
  'Sistema',
  'admin',
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Cliente 1
INSERT INTO public.usuarios (id, nombre, apellido, rol, esta_activo, fecha_creacion)
VALUES (
  '5e09f1d3-4fee-4176-8590-78cc185fdd5b',
  'Cliente',
  'Uno',
  'cliente',
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Cliente 2
INSERT INTO public.usuarios (id, nombre, apellido, rol, esta_activo, fecha_creacion)
VALUES (
  '85006822-70dd-4ad5-9b78-15ce363f50e0',
  'Cliente',
  'Dos',
  'cliente',
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ACTUALIZAR METADATA EN AUTH.USERS
-- ============================================
-- Esto asegura que el rol esté en el JWT para las políticas RLS

-- Admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{rol}',
  '"admin"'
)
WHERE id = '7739461e-ccbf-4b14-a827-c788eb12c347';

-- Cliente 1
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{rol}',
  '"cliente"'
)
WHERE id = '5e09f1d3-4fee-4176-8590-78cc185fdd5b';

-- Cliente 2
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{rol}',
  '"cliente"'
)
WHERE id = '85006822-70dd-4ad5-9b78-15ce363f50e0';

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT id, nombre, apellido, rol FROM usuarios;
