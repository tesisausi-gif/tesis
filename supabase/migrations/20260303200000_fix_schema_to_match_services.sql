-- =====================================================================
-- MIGRACIÓN: Alinear esquema de producción con los service files
-- =====================================================================
-- Los service files fueron escritos para un esquema nuevo, pero la DB
-- de producción tiene columnas con nombres distintos.
-- Esta migración transforma la DB para que coincida con el código.
-- SEGURA: Todas las tablas afectadas están vacías en producción.
-- =====================================================================

-- ─── 1. incidentes ─────────────────────────────────────────────────────────
-- fue_resuelto: INTEGER → BOOLEAN
-- Agregar calificacion_admin y comentario_admin

ALTER TABLE public.incidentes ALTER COLUMN fue_resuelto DROP DEFAULT;
ALTER TABLE public.incidentes
  ALTER COLUMN fue_resuelto TYPE BOOLEAN
    USING CASE WHEN fue_resuelto = 1 THEN TRUE ELSE FALSE END;
ALTER TABLE public.incidentes ALTER COLUMN fue_resuelto SET DEFAULT FALSE;

ALTER TABLE public.incidentes
  ADD COLUMN IF NOT EXISTS calificacion_admin INTEGER
    CHECK (calificacion_admin >= 1 AND calificacion_admin <= 5),
  ADD COLUMN IF NOT EXISTS comentario_admin TEXT;

COMMENT ON COLUMN public.incidentes.calificacion_admin IS 'Calificación 1-5 del admin sobre la resolución del incidente';
COMMENT ON COLUMN public.incidentes.comentario_admin IS 'Observaciones del admin sobre la resolución';

-- ─── 2. inspecciones ───────────────────────────────────────────────────────
-- Reemplazar campos detallados por hallazgos/fotos_url/estado_inmueble/observaciones

ALTER TABLE public.inspecciones
  DROP COLUMN IF EXISTS causas_determinadas,
  DROP COLUMN IF EXISTS danos_ocasionados,
  DROP COLUMN IF EXISTS requiere_materiales,
  DROP COLUMN IF EXISTS descripcion_materiales,
  DROP COLUMN IF EXISTS requiere_ayudantes,
  DROP COLUMN IF EXISTS cantidad_ayudantes,
  DROP COLUMN IF EXISTS dias_estimados_trabajo;

ALTER TABLE public.inspecciones
  ADD COLUMN IF NOT EXISTS hallazgos TEXT,
  ADD COLUMN IF NOT EXISTS fotos_url TEXT[],
  ADD COLUMN IF NOT EXISTS estado_inmueble VARCHAR(50)
    CHECK (estado_inmueble IN ('bueno', 'requiere_reparacion', 'critico')),
  ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- ─── 3. avances_reparacion ─────────────────────────────────────────────────
-- Renombrar descripcion_avance → descripcion, porcentaje_completado → porcentaje_avance
-- Agregar fotos_url, quitar requiere_nueva_etapa/observaciones

ALTER TABLE public.avances_reparacion
  RENAME COLUMN descripcion_avance TO descripcion;

ALTER TABLE public.avances_reparacion
  RENAME COLUMN porcentaje_completado TO porcentaje_avance;

ALTER TABLE public.avances_reparacion
  DROP COLUMN IF EXISTS requiere_nueva_etapa,
  DROP COLUMN IF EXISTS observaciones;

ALTER TABLE public.avances_reparacion
  ADD COLUMN IF NOT EXISTS fotos_url TEXT[];

-- Renombrar fecha_registro si existe (puede llamarse fecha_creacion)
-- No lo cambiamos para evitar romper las RLS que puedan referenciar fecha_creacion

-- ─── 4. presupuestos ────────────────────────────────────────────────────────
-- Agregar id_tecnico, renombrar descripcion_detallada, quitar columnas detalladas

ALTER TABLE public.presupuestos
  ADD COLUMN IF NOT EXISTS id_tecnico INTEGER REFERENCES public.tecnicos(id_tecnico);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presupuestos' AND column_name = 'descripcion_detallada'
  ) THEN
    ALTER TABLE public.presupuestos RENAME COLUMN descripcion_detallada TO descripcion_trabajo;
  END IF;
END $$;

ALTER TABLE public.presupuestos
  DROP COLUMN IF EXISTS costo_materiales,
  DROP COLUMN IF EXISTS costo_mano_obra,
  DROP COLUMN IF EXISTS gastos_administrativos,
  DROP COLUMN IF EXISTS id_aprobado_por,
  DROP COLUMN IF EXISTS alternativas_reparacion;

ALTER TABLE public.presupuestos
  ADD COLUMN IF NOT EXISTS detalles_trabajo TEXT,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_rechazo TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS razon_rechazo TEXT,
  ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMPTZ;

-- Actualizar constraint de estado_presupuesto si no tiene 'borrador'
DO $$
BEGIN
  -- Verificar si el constraint ya existe con los valores correctos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'presupuestos_estado_presupuesto_check_new'
    AND table_name = 'presupuestos'
  ) THEN
    ALTER TABLE public.presupuestos DROP CONSTRAINT IF EXISTS presupuestos_estado_presupuesto_check;
    ALTER TABLE public.presupuestos
      ADD CONSTRAINT presupuestos_estado_presupuesto_check
      CHECK (estado_presupuesto IN ('borrador', 'enviado', 'aprobado_admin', 'aprobado', 'rechazado', 'vencido'));
  END IF;
END $$;

-- ─── 5. pagos ───────────────────────────────────────────────────────────────
-- Renombrar monto_pagado → monto, numero_comprobante → numero_referencia,
-- url_comprobante → comprobante_url. Agregar id_cliente.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagos' AND column_name = 'monto_pagado') THEN
    ALTER TABLE public.pagos RENAME COLUMN monto_pagado TO monto;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagos' AND column_name = 'numero_comprobante') THEN
    ALTER TABLE public.pagos RENAME COLUMN numero_comprobante TO numero_referencia;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagos' AND column_name = 'url_comprobante') THEN
    ALTER TABLE public.pagos RENAME COLUMN url_comprobante TO comprobante_url;
  END IF;
END $$;

ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS id_cliente INTEGER REFERENCES public.clientes(id_cliente),
  ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ DEFAULT NOW();

-- ─── 6. conformidades ──────────────────────────────────────────────────────
-- Quitar tipo_conformidad/url_documento, agregar descripcion_trabajo,
-- renombrar fecha_conformidad → fecha_firma, convertir esta_firmada a BOOLEAN

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conformidades' AND column_name = 'fecha_conformidad') THEN
    ALTER TABLE public.conformidades RENAME COLUMN fecha_conformidad TO fecha_firma;
  END IF;
END $$;

ALTER TABLE public.conformidades
  DROP COLUMN IF EXISTS tipo_conformidad,
  DROP COLUMN IF EXISTS url_documento;

-- Convertir esta_firmada de INTEGER a BOOLEAN
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'conformidades' AND column_name = 'esta_firmada';

  IF col_type = 'integer' THEN
    ALTER TABLE public.conformidades ALTER COLUMN esta_firmada DROP DEFAULT;
    ALTER TABLE public.conformidades
      ALTER COLUMN esta_firmada TYPE BOOLEAN
      USING CASE WHEN esta_firmada = 1 THEN TRUE ELSE FALSE END;
    ALTER TABLE public.conformidades
      ALTER COLUMN esta_firmada SET DEFAULT FALSE;
  END IF;
END $$;

ALTER TABLE public.conformidades
  ADD COLUMN IF NOT EXISTS descripcion_trabajo TEXT;

-- ─── 7. calificaciones ─────────────────────────────────────────────────────
-- Renombrar puntuacion → estrellas, comentarios → comentario
-- Quitar tipo_calificacion/resolvio_problema, agregar id_cliente/aspecto_tecnico/etc.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calificaciones' AND column_name = 'puntuacion') THEN
    ALTER TABLE public.calificaciones RENAME COLUMN puntuacion TO estrellas;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calificaciones' AND column_name = 'comentarios') THEN
    ALTER TABLE public.calificaciones RENAME COLUMN comentarios TO comentario;
  END IF;
END $$;

ALTER TABLE public.calificaciones
  DROP COLUMN IF EXISTS tipo_calificacion,
  DROP COLUMN IF EXISTS resolvio_problema;

ALTER TABLE public.calificaciones
  ADD COLUMN IF NOT EXISTS id_cliente INTEGER REFERENCES public.clientes(id_cliente),
  ADD COLUMN IF NOT EXISTS aspecto_tecnico INTEGER CHECK (aspecto_tecnico BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS puntualidad INTEGER CHECK (puntualidad BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS actitud INTEGER CHECK (actitud BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS fecha_calificacion_ts TIMESTAMPTZ DEFAULT NOW();

-- ─── 8. Fix boolean types en otras tablas ─────────────────────────────────
-- tecnicos.esta_activo, clientes.esta_activo, inmuebles.esta_activo,
-- avances_reparacion.requiere_nueva_etapa (si aún existe)
-- Estas deberían ya ser boolean por la migración 20260217000000

-- Verificar/convertir esta_activo en tecnicos si es integer
DO $$
DECLARE col_type TEXT;
BEGIN
  SELECT data_type INTO col_type FROM information_schema.columns
  WHERE table_name = 'tecnicos' AND column_name = 'esta_activo';
  IF col_type = 'integer' THEN
    ALTER TABLE public.tecnicos ALTER COLUMN esta_activo DROP DEFAULT;
    ALTER TABLE public.tecnicos ALTER COLUMN esta_activo TYPE BOOLEAN
      USING CASE WHEN esta_activo = 1 THEN TRUE ELSE FALSE END;
    ALTER TABLE public.tecnicos ALTER COLUMN esta_activo SET DEFAULT TRUE;
  END IF;
END $$;

DO $$
DECLARE col_type TEXT;
BEGIN
  SELECT data_type INTO col_type FROM information_schema.columns
  WHERE table_name = 'clientes' AND column_name = 'esta_activo';
  IF col_type = 'integer' THEN
    ALTER TABLE public.clientes ALTER COLUMN esta_activo DROP DEFAULT;
    ALTER TABLE public.clientes ALTER COLUMN esta_activo TYPE BOOLEAN
      USING CASE WHEN esta_activo = 1 THEN TRUE ELSE FALSE END;
    ALTER TABLE public.clientes ALTER COLUMN esta_activo SET DEFAULT TRUE;
  END IF;
END $$;

DO $$
DECLARE col_type TEXT;
BEGIN
  SELECT data_type INTO col_type FROM information_schema.columns
  WHERE table_name = 'inmuebles' AND column_name = 'esta_activo';
  IF col_type = 'integer' THEN
    ALTER TABLE public.inmuebles ALTER COLUMN esta_activo DROP DEFAULT;
    ALTER TABLE public.inmuebles ALTER COLUMN esta_activo TYPE BOOLEAN
      USING CASE WHEN esta_activo = 1 THEN TRUE ELSE FALSE END;
    ALTER TABLE public.inmuebles ALTER COLUMN esta_activo SET DEFAULT TRUE;
  END IF;
END $$;
