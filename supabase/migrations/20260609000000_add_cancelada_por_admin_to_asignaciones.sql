-- Distingue si una asignación cancelada fue por el técnico o por el admin.
-- Necesario para mostrar el mensaje correcto en el panel de administración.

ALTER TABLE public.asignaciones_tecnico
  ADD COLUMN IF NOT EXISTS cancelada_por_admin BOOLEAN NOT NULL DEFAULT FALSE;
