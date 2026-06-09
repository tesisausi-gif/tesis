-- Distingue quién rechazó el presupuesto: 'admin' (rechazó el presupuesto del técnico)
-- o 'cliente' (rechazó el presupuesto aprobado por administración).

ALTER TABLE public.presupuestos
  ADD COLUMN IF NOT EXISTS rechazado_por TEXT CHECK (rechazado_por IN ('admin', 'cliente'));
