-- Añadir columnas de timestamp para aceptación/rechazo en asignaciones_tecnico
-- Fecha: 2026-01-29

ALTER TABLE public.asignaciones_tecnico
  ADD COLUMN IF NOT EXISTS fecha_aceptacion TIMESTAMP,
  ADD COLUMN IF NOT EXISTS fecha_rechazo TIMESTAMP;

COMMENT ON COLUMN public.asignaciones_tecnico.fecha_aceptacion IS 'Timestamp cuando el técnico aceptó la asignación';
COMMENT ON COLUMN public.asignaciones_tecnico.fecha_rechazo IS 'Timestamp cuando el técnico rechazó la asignación';
