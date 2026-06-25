-- Migración: mover la creación de registros en tablas públicas
-- al momento en que el usuario confirma el email, NO al momento del signUp.
--
-- Antes: trigger AFTER INSERT → llenaba clientes/usuarios aunque el mail nunca se confirmara.
-- Ahora: trigger AFTER UPDATE cuando email_confirmed_at pasa de NULL a NOT NULL.
--
-- Los datos (nombre, apellido, dni, etc.) quedan guardados en auth.users.raw_user_meta_data
-- durante el tiempo que el usuario tarda en verificar el mail.
-- Recién al confirmar, se insertan en public.clientes y public.usuarios.

-- ── 1. Eliminar trigger anterior ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ── 2. Función que crea los registros públicos al confirmar el email ──────────
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_id_cliente INTEGER;
  v_id_tecnico INTEGER;
  v_rol        TEXT;
BEGIN
  -- Solo actuar si realmente acaba de confirmarse el email en este UPDATE
  IF OLD.email_confirmed_at IS NOT NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si el usuario ya existe en public.usuarios no hacer nada (re-confirmaciones)
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_id_cliente := NULL;
  v_id_tecnico := NULL;
  v_rol := COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente');

  -- Crear registro en clientes
  IF v_rol = 'cliente' THEN
    INSERT INTO public.clientes (
      nombre, apellido, correo_electronico, telefono, dni,
      esta_activo, fecha_creacion, fecha_modificacion
    )
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
      COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'telefono', NULL),
      COALESCE(NEW.raw_user_meta_data->>'dni', NULL),
      true, NOW(), NOW()
    )
    RETURNING id_cliente INTO v_id_cliente;
  END IF;

  -- Crear registro en tecnicos
  IF v_rol = 'tecnico' THEN
    INSERT INTO public.tecnicos (
      nombre, apellido, correo_electronico, telefono, dni,
      direccion, especialidad, calificacion_promedio,
      cantidad_trabajos_realizados, esta_activo, fecha_creacion, fecha_modificacion
    )
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
      COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'telefono', NULL),
      COALESCE(NEW.raw_user_meta_data->>'dni', NULL),
      COALESCE(NEW.raw_user_meta_data->>'direccion', NULL),
      COALESCE(NEW.raw_user_meta_data->>'especialidad', 'general'),
      NULL, 0, true, NOW(), NOW()
    )
    RETURNING id_tecnico INTO v_id_tecnico;
  END IF;

  -- Crear registro en usuarios
  INSERT INTO public.usuarios (
    id, nombre, apellido, correo_electronico, rol,
    id_cliente, id_tecnico, esta_activo, fecha_creacion, fecha_modificacion
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
    NEW.email,
    v_rol,
    v_id_cliente,
    v_id_tecnico,
    true, NOW(), NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_user_email_confirmed() IS
  'Crea registros en public.usuarios/clientes/tecnicos SOLO cuando el usuario confirma su email.
   Antes de la confirmación, los datos viven únicamente en auth.users.raw_user_meta_data.
   Esto evita que registros spam llenen las tablas públicas.';

-- ── 3. Nuevo trigger — dispara en UPDATE cuando se confirma el email ──────────
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_confirmed();

-- ── 4. Función auxiliar: verificar si un email ya existe en auth.users ────────
-- Permite al frontend detectar intentos de re-registro (confirmado o pendiente)
-- sin exponer auth.users directamente.
CREATE OR REPLACE FUNCTION public.check_email_registered(p_email TEXT)
RETURNS TABLE(existe BOOLEAN, confirmado BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE::BOOLEAN,
    (email_confirmed_at IS NOT NULL)::BOOLEAN
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  -- Si no hubo fila, devolver false/false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, FALSE::BOOLEAN;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.check_email_registered(TEXT) IS
  'Verifica si un email ya existe en auth.users (puede estar pendiente de confirmación o ya confirmado).
   Retorna (existe, confirmado). Usada por el frontend antes del signUp para dar feedback claro al usuario.';
