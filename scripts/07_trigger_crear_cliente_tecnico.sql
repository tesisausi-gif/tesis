-- ============================================
-- TRIGGER MEJORADO: CREAR USUARIOS + CLIENTES/TECNICOS
-- ============================================
-- Este trigger crea automáticamente registros en:
-- - public.usuarios (siempre)
-- - public.clientes (cuando rol='cliente')
-- - public.tecnicos (cuando rol='tecnico')
-- Y vincula correctamente las relaciones id_cliente e id_tecnico

-- ============================================
-- FUNCIÓN MEJORADA DEL TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_id_cliente INTEGER;
  v_id_tecnico INTEGER;
BEGIN
  -- Variables para almacenar los IDs generados
  v_id_cliente := NULL;
  v_id_tecnico := NULL;

  -- Si el rol es 'cliente', crear registro en tabla clientes
  IF COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente') = 'cliente' THEN
    INSERT INTO public.clientes (
      nombre,
      apellido,
      correo_electronico,
      telefono,
      dni,
      tipo_cliente,
      esta_activo,
      fecha_creacion,
      fecha_modificacion
    )
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
      COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'telefono', NULL),
      COALESCE(NEW.raw_user_meta_data->>'dni', NULL),
      COALESCE(NEW.raw_user_meta_data->>'tipo_cliente', 'particular'),
      true,
      NOW(),
      NOW()
    )
    RETURNING id_cliente INTO v_id_cliente;
  END IF;

  -- Si el rol es 'tecnico', crear registro en tabla tecnicos
  IF COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente') = 'tecnico' THEN
    INSERT INTO public.tecnicos (
      nombre,
      apellido,
      correo_electronico,
      telefono,
      dni,
      direccion,
      especialidad,
      calificacion_promedio,
      cantidad_trabajos_realizados,
      esta_activo,
      fecha_creacion,
      fecha_modificacion
    )
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
      COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'telefono', NULL),
      COALESCE(NEW.raw_user_meta_data->>'dni', NULL),
      COALESCE(NEW.raw_user_meta_data->>'direccion', NULL),
      COALESCE(NEW.raw_user_meta_data->>'especialidad', 'general'),
      NULL, -- calificacion_promedio inicial
      0,    -- cantidad_trabajos_realizados inicial
      true,
      NOW(),
      NOW()
    )
    RETURNING id_tecnico INTO v_id_tecnico;
  END IF;

  -- Crear registro en tabla usuarios con las referencias correspondientes
  INSERT INTO public.usuarios (
    id,
    nombre,
    apellido,
    rol,
    id_cliente,
    id_tecnico,
    esta_activo,
    fecha_creacion,
    fecha_modificacion
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente'),
    v_id_cliente,  -- NULL si no es cliente
    v_id_tecnico,  -- NULL si no es técnico
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RECREAR EL TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para probar:
-- 1. Registra un nuevo cliente desde /register
-- 2. Verifica que se creó en todas las tablas:

-- SELECT * FROM usuarios WHERE rol = 'cliente' ORDER BY fecha_creacion DESC LIMIT 1;
-- SELECT * FROM clientes ORDER BY fecha_creacion DESC LIMIT 1;

-- 3. Verifica que la relación está correcta:
-- SELECT
--   u.id,
--   u.nombre,
--   u.apellido,
--   u.rol,
--   u.id_cliente,
--   c.nombre as cliente_nombre,
--   c.correo_electronico
-- FROM usuarios u
-- LEFT JOIN clientes c ON u.id_cliente = c.id_cliente
-- WHERE u.rol = 'cliente'
-- ORDER BY u.fecha_creacion DESC
-- LIMIT 5;

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger mejorado que crea automáticamente registros en usuarios, clientes y tecnicos según el rol';
