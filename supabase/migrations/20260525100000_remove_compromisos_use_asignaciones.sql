-- Agregar hora_fin_programada a asignaciones_tecnico para reemplazar compromisos_tecnico.
-- La hora_inicio ya existe implícita en fecha_visita_programada (TIMESTAMPTZ).
ALTER TABLE public.asignaciones_tecnico
  ADD COLUMN IF NOT EXISTS hora_fin_programada TIME;

-- Vaciar y eliminar la tabla compromisos_tecnico (ya no se usa)
DROP TABLE IF EXISTS public.compromisos_tecnico;
