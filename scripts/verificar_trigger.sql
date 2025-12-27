-- ============================================
-- SCRIPT DE VERIFICACIÓN DEL TRIGGER
-- ============================================
-- Este script te ayuda a verificar que el trigger
-- handle_new_user() esté activo y funcionando correctamente

-- ============================================
-- 1. VERIFICAR SI EL TRIGGER EXISTE
-- ============================================
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Si no ves resultados, el trigger NO está creado.
-- Ejecuta el script: 07_trigger_crear_cliente_tecnico.sql

-- ============================================
-- 2. VERIFICAR SI LA FUNCIÓN EXISTE
-- ============================================
SELECT
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- Si no ves resultados, la función NO está creada.
-- Ejecuta el script: 07_trigger_crear_cliente_tecnico.sql

-- ============================================
-- 3. VER EL CÓDIGO DE LA FUNCIÓN
-- ============================================
SELECT pg_get_functiondef('public.handle_new_user'::regproc);

-- Esto te mostrará el código completo de la función

-- ============================================
-- 4. VERIFICAR USUARIOS Y CLIENTES EXISTENTES
-- ============================================
-- Ver cuántos usuarios hay por rol
SELECT rol, COUNT(*) as cantidad
FROM usuarios
GROUP BY rol;

-- Ver cuántos clientes hay
SELECT COUNT(*) as total_clientes FROM clientes;

-- Ver usuarios que NO tienen cliente asociado (esto debería estar vacío)
SELECT u.id, u.nombre, u.apellido, u.rol, u.id_cliente
FROM usuarios u
WHERE u.rol = 'cliente' AND u.id_cliente IS NULL;

-- Si hay usuarios con rol='cliente' pero id_cliente es NULL,
-- significa que el trigger no se está ejecutando correctamente

-- ============================================
-- 5. VERIFICAR LA RELACIÓN USUARIOS-CLIENTES
-- ============================================
SELECT
  u.id,
  u.nombre as usuario_nombre,
  u.apellido as usuario_apellido,
  u.rol,
  u.id_cliente,
  c.nombre as cliente_nombre,
  c.correo_electronico,
  c.tipo_cliente,
  u.fecha_creacion
FROM usuarios u
LEFT JOIN clientes c ON u.id_cliente = c.id_cliente
WHERE u.rol = 'cliente'
ORDER BY u.fecha_creacion DESC
LIMIT 10;

-- Esta consulta muestra los últimos 10 usuarios con rol='cliente'
-- y si tienen un registro correspondiente en la tabla clientes

-- ============================================
-- 6. PRUEBA DEL TRIGGER (SOLO SI ESTÁ INACTIVO)
-- ============================================
-- Si el trigger no está funcionando, puedes crear manualmente
-- los registros de clientes faltantes con este query:

/*
DO $$
DECLARE
  usuario_record RECORD;
  nuevo_id_cliente INTEGER;
BEGIN
  -- Recorrer todos los usuarios con rol='cliente' que NO tienen id_cliente
  FOR usuario_record IN
    SELECT u.id, u.nombre, u.apellido, au.email
    FROM usuarios u
    JOIN auth.users au ON u.id = au.id
    WHERE u.rol = 'cliente' AND u.id_cliente IS NULL
  LOOP
    -- Crear el registro en clientes
    INSERT INTO clientes (
      nombre,
      apellido,
      correo_electronico,
      tipo_cliente,
      esta_activo,
      fecha_creacion,
      fecha_modificacion
    ) VALUES (
      usuario_record.nombre,
      usuario_record.apellido,
      usuario_record.email,
      'particular',
      true,
      NOW(),
      NOW()
    )
    RETURNING id_cliente INTO nuevo_id_cliente;

    -- Actualizar el usuario con el id_cliente
    UPDATE usuarios
    SET id_cliente = nuevo_id_cliente,
        fecha_modificacion = NOW()
    WHERE id = usuario_record.id;

    RAISE NOTICE 'Cliente creado para usuario: % % (ID: %)',
      usuario_record.nombre, usuario_record.apellido, nuevo_id_cliente;
  END LOOP;
END $$;
*/

-- ============================================
-- RESUMEN DE VERIFICACIÓN
-- ============================================
-- 1. Verifica que el trigger existe (query #1)
-- 2. Verifica que la función existe (query #2)
-- 3. Verifica que no hay usuarios sin cliente (query #4, tercera consulta)
-- 4. Si hay usuarios sin cliente, ejecuta el código comentado (#6)
--    para crear los registros faltantes
-- 5. Después de eso, el trigger debería funcionar automáticamente
--    para nuevos registros
