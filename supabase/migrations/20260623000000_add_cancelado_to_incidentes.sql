-- Agregar estado 'cancelado' a incidentes.
-- Un incidente cancelado queda como registro histórico pero no se cuenta en estadísticas.
-- Solo puede cancelarse antes de que el cliente apruebe el presupuesto.
ALTER TABLE public.incidentes DROP CONSTRAINT IF EXISTS incidentes_estado_actual_check;
ALTER TABLE public.incidentes
  ADD CONSTRAINT incidentes_estado_actual_check
  CHECK (estado_actual IN (
    'pendiente',
    'asignacion_solicitada',
    'en_proceso',
    'resuelto',
    'finalizado',
    'cancelado'
  ));
