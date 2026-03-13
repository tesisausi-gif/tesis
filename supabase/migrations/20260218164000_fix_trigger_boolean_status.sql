-- Migración: Actualizar trigger handle_new_user para usar booleanos consistentes
-- Esto corrige el Bug ID 233 y Bug ID 234 (Inhabilitación alta Cliente/Técnico)
-- ya que las tablas clientes y tecnicos ahora usan boolean para esta_activo.

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
      true,  -- Corregido: usar true (boolean) en lugar de 1
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
      true, -- Corregido: usar true (boolean) en lugar de 1
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
    true,  -- BOOLEAN para tabla usuarios
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger que crea registros en usuarios, clientes y tecnicos. Usa BOOLEAN para esta_activo de forma consistente en todas las tablas.';
