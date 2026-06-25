-- Distinguir si un incidente cancelado fue cancelado por el cliente o por la administración.
-- Esto permite mostrar estadísticas de cancelaciones por cliente en los indicadores.
ALTER TABLE public.incidentes
  ADD COLUMN IF NOT EXISTS cancelado_por_cliente BOOLEAN NOT NULL DEFAULT FALSE;
