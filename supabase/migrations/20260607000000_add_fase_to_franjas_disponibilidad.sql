-- Agrega fase a franjas_disponibilidad para diferenciar disponibilidad
-- de inspección (fase original) vs disponibilidad de reparación/obra.

ALTER TABLE public.franjas_disponibilidad
  ADD COLUMN IF NOT EXISTS fase TEXT NOT NULL DEFAULT 'inspeccion'
  CHECK (fase IN ('inspeccion', 'reparacion'));

CREATE INDEX IF NOT EXISTS idx_franjas_fase ON public.franjas_disponibilidad(id_incidente, fase);
