-- ============================================
-- DIAGNÓSTICO DEL TRIGGER
-- ============================================
-- Este script verifica el estado del trigger y ayuda a diagnosticar problemas

-- 1. Verificar que el trigger existe
SELECT
  tgname as nombre_trigger,
  tgenabled as habilitado,
  tgrelid::regclass as tabla
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 2. Verificar que la función existe
SELECT
  proname as nombre_funcion,
  prosrc as codigo_funcion
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 3. Ver últimos usuarios en auth.users (últimos 3)
SELECT
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 3;

-- 4. Ver últimos usuarios en tabla usuarios
SELECT
  id,
  nombre,
  apellido,
  rol,
  id_cliente,
  id_tecnico,
  fecha_creacion
FROM public.usuarios
ORDER BY fecha_creacion DESC
LIMIT 3;

-- 5. Ver últimos clientes creados
SELECT
  id_cliente,
  nombre,
  apellido,
  correo_electronico,
  fecha_creacion
FROM public.clientes
ORDER BY fecha_creacion DESC
LIMIT 3;

-- 6. Verificar políticas RLS de clientes
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'clientes';

-- ============================================
-- INSTRUCCIONES:
-- ============================================
-- 1. Ejecuta este script completo en Supabase SQL Editor
-- 2. Revisa cada resultado:
--    - Si el trigger NO existe, ejecuta el script 07
--    - Si la función NO existe, ejecuta el script 07
--    - Si hay usuarios en auth.users pero NO en usuarios/clientes, el trigger no está funcionando
-- 3. Copia los resultados y envíalos para diagnosticar el problema
