-- ============================================
-- CREAR USUARIO ADMINISTRADOR
-- ============================================
-- Este script crea el usuario administrador inicial del sistema
-- Email: admin
-- Password: admin123

-- IMPORTANTE: Ejecuta este script en el SQL Editor de Supabase
-- Dashboard → SQL Editor → New query → Run

-- ============================================
-- Nota: No podemos crear usuarios directamente en auth.users desde SQL
-- Debes crear el usuario manualmente o usar el endpoint de Admin API
-- ============================================

-- OPCIÓN 1: Crear desde el Dashboard de Supabase
-- 1. Ve a Authentication → Users → Add user → Create new user
-- 2. Email: admin
-- 3. Password: admin123
-- 4. Auto Confirm User: ON (activado)
-- 5. Copia el UUID que se genera

-- OPCIÓN 2: Después de crear el usuario en el dashboard, ejecuta esto:
-- Reemplaza 'UUID_DEL_USUARIO' con el UUID que copiaste

-- INSERT INTO public.usuarios (id, nombre, apellido, rol, esta_activo)
-- VALUES (
--   'UUID_DEL_USUARIO',
--   'Administrador',
--   'Sistema',
--   'admin',
--   true
-- );

-- ============================================
-- VERIFICAR USUARIO
-- ============================================
-- SELECT * FROM public.usuarios WHERE rol = 'admin';
