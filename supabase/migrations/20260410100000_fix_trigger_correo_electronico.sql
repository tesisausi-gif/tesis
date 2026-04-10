-- ============================================================
-- FIX: Agregar correo_electronico al trigger handle_new_user
-- ============================================================
-- Problema: el trigger nunca insertaba correo_electronico en
-- public.usuarios, lo que causaba "database error saving new user"
-- cuando la columna tiene restriccion NOT NULL, o dejaba correo_electronico
-- NULL para todos los usuarios (rompiendo las busquedas por email).
--
-- Solucion: asegurar que la columna existe como nullable y poblarla
-- en el trigger con NEW.email (el email del usuario de auth.users).
-- ============================================================

-- 1. Asegurar que la columna correo_electronico existe en usuarios
--    Si ya existe (posiblemente como NOT NULL), no la toca.
--    Si no existe, la agrega como nullable para no romper filas existentes.
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS correo_electronico TEXT;

-- 2. Actualizar trigger con correo_electronico en el INSERT de usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_id_cliente INTEGER;
  v_id_tecnico INTEGER;
BEGIN
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
      NULL,
      0,
      true,
      NOW(),
      NOW()
    )
    RETURNING id_tecnico INTO v_id_tecnico;
  END IF;

  -- Crear registro en tabla usuarios — ahora incluye correo_electronico
  INSERT INTO public.usuarios (
    id,
    nombre,
    apellido,
    correo_electronico,
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
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente'),
    v_id_cliente,
    v_id_tecnico,
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger que crea registros en usuarios, clientes y tecnicos al registrarse. Incluye correo_electronico en todos los INSERTs.';
