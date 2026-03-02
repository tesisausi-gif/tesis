-- Agrega campos para calificación del área técnica (admin) a la tabla incidentes
-- El admin puede calificar la calidad de la resolución de cada incidente resuelto

ALTER TABLE public.incidentes
  ADD COLUMN IF NOT EXISTS calificacion_admin INTEGER
    CHECK (calificacion_admin >= 1 AND calificacion_admin <= 5),
  ADD COLUMN IF NOT EXISTS comentario_admin TEXT;

COMMENT ON COLUMN public.incidentes.calificacion_admin IS 'Calificación 1-5 dada por el área técnica/admin sobre la resolución del incidente';
COMMENT ON COLUMN public.incidentes.comentario_admin IS 'Observaciones del admin sobre la calidad de la resolución';
