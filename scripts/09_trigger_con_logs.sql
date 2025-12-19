-- ============================================
-- TRIGGER CON MANEJO DE ERRORES Y LOGS
-- ============================================
-- Versión mejorada del trigger que muestra errores específicos

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_id_cliente INTEGER;
  v_id_tecnico INTEGER;
  v_rol TEXT;
BEGIN
  -- Obtener el rol del usuario
  v_rol := COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente');

  -- Log para debugging
  RAISE NOTICE 'Trigger ejecutado para usuario: %, rol: %', NEW.email, v_rol;

  -- Inicializar variables
  v_id_cliente := NULL;
  v_id_tecnico := NULL;

  -- Si el rol es 'cliente', crear registro en tabla clientes
  IF v_rol = 'cliente' THEN
    BEGIN
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

      RAISE NOTICE 'Cliente creado con ID: %', v_id_cliente;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error al crear cliente: %', SQLERRM;
      -- No detener el proceso, continuar
    END;
  END IF;

  -- Si el rol es 'tecnico', crear registro en tabla tecnicos
  IF v_rol = 'tecnico' THEN
    BEGIN
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
        NULL,
        0,
        true,
        NOW(),
        NOW()
      )
      RETURNING id_tecnico INTO v_id_tecnico;

      RAISE NOTICE 'Técnico creado con ID: %', v_id_tecnico;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error al crear técnico: %', SQLERRM;
      -- No detener el proceso, continuar
    END;
  END IF;

  -- Crear registro en tabla usuarios con las referencias correspondientes
  BEGIN
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
      v_rol,
      v_id_cliente,
      v_id_tecnico,
      true,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Usuario creado en tabla usuarios';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error CRÍTICO al crear usuario en tabla usuarios: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Comentario
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger con manejo de errores que crea registros en usuarios, clientes y tecnicos';

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 'Trigger actualizado correctamente' as mensaje;
