-- Permite que el técnico cancele una asignación ya aceptada.
-- Se amplía el CHECK constraint de estado_asignacion para incluir 'cancelada'.

ALTER TABLE public.asignaciones_tecnico
  DROP CONSTRAINT IF EXISTS asignaciones_tecnico_estado_asignacion_check;

ALTER TABLE public.asignaciones_tecnico
  ADD CONSTRAINT asignaciones_tecnico_estado_asignacion_check
  CHECK (estado_asignacion IN ('pendiente', 'aceptada', 'rechazada', 'cancelada', 'en_curso', 'completada'));
