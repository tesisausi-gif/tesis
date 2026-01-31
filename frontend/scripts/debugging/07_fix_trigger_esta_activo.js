const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function fixTrigger() {
  console.log('🔧 Actualizando trigger handle_new_user...\n')

  // Como no podemos ejecutar SQL directamente desde JS,
  // vamos a usar el Supabase Dashboard SQL Editor

  const sqlQuery = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_id_cliente INTEGER;
  v_id_tecnico INTEGER;
BEGIN
  v_id_cliente := NULL;
  v_id_tecnico := NULL;

  IF COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente') = 'cliente' THEN
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
      1,
      NOW(),
      NOW()
    )
    RETURNING id_cliente INTO v_id_cliente;
  END IF;

  IF COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente') = 'tecnico' THEN
    INSERT INTO public.tecnicos (
      nombre, apellido, correo_electronico, telefono, dni,
      direccion, especialidad, calificacion_promedio,
      cantidad_trabajos_realizados, esta_activo,
      fecha_creacion, fecha_modificacion
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
      1,
      NOW(),
      NOW()
    )
    RETURNING id_tecnico INTO v_id_tecnico;
  END IF;

  INSERT INTO public.usuarios (
    id, nombre, apellido, rol, id_cliente, id_tecnico,
    esta_activo, fecha_creacion, fecha_modificacion
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
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
  `

  console.log('📋 Por favor ejecuta este SQL en el Supabase Dashboard:\n')
  console.log('Dashboard → SQL Editor → New Query → Pega el código → Run\n')
  console.log(sqlQuery)
  console.log('\n✅ Una vez ejecutado, el trigger estará corregido y podrás registrar usuarios.')
}

fixTrigger()
