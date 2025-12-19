-- ============================================
-- CONFIRMAR EMAILS DE USUARIOS EXISTENTES
-- ============================================
-- Este script confirma los emails de usuarios que se registraron
-- antes de desactivar la confirmación de email

-- Confirmar todos los usuarios sin confirmar
UPDATE auth.users
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Ver el resultado
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'rol' as rol
FROM auth.users
ORDER BY created_at DESC;

-- Mensaje de confirmación
SELECT 'Emails confirmados exitosamente' as mensaje;
