-- Campos para el flujo de decisión al rechazar el primer presupuesto por el cliente
ALTER TABLE public.presupuestos
  ADD COLUMN IF NOT EXISTS nota_rechazo_cliente  TEXT NULL,
  ADD COLUMN IF NOT EXISTS decision_cliente       TEXT NULL,
  ADD COLUMN IF NOT EXISTS decision_tecnico       TEXT NULL;

ALTER TABLE public.presupuestos
  ADD CONSTRAINT presupuesto_decision_cliente_check
    CHECK (decision_cliente IS NULL OR decision_cliente IN ('nuevo_tecnico', 'otra_oportunidad'));

ALTER TABLE public.presupuestos
  ADD CONSTRAINT presupuesto_decision_tecnico_check
    CHECK (decision_tecnico IS NULL OR decision_tecnico IN ('acepta', 'rechaza'));
