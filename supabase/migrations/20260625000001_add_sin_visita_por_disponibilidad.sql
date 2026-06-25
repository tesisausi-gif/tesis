ALTER TABLE public.incidentes
  ADD COLUMN IF NOT EXISTS sin_visita_por_disponibilidad BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.incidentes.sin_visita_por_disponibilidad
  IS 'TRUE cuando las franjas de disponibilidad de inspección vencieron sin que ningún técnico visitara al cliente.';
