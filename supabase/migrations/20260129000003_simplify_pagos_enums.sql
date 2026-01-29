-- Simplificar tipos y métodos de pago a valores en minúsculas

-- PAGOS - tipo_pago
ALTER TABLE pagos
DROP CONSTRAINT IF EXISTS pagos_tipo_pago_check;

UPDATE pagos
SET tipo_pago = CASE
  WHEN tipo_pago IN ('Adelanto', 'ADELANTO') THEN 'adelanto'
  WHEN tipo_pago IN ('Parcial', 'PARCIAL') THEN 'parcial'
  WHEN tipo_pago IN ('Total', 'TOTAL') THEN 'total'
  WHEN tipo_pago IN ('Reembolso', 'REEMBOLSO') THEN 'reembolso'
  WHEN tipo_pago IN ('adelanto', 'parcial', 'total', 'reembolso') THEN tipo_pago
  ELSE 'parcial'
END;

ALTER TABLE pagos
ADD CONSTRAINT pagos_tipo_pago_check
CHECK (tipo_pago IN ('adelanto', 'parcial', 'total', 'reembolso'));

-- PAGOS - metodo_pago
ALTER TABLE pagos
DROP CONSTRAINT IF EXISTS pagos_metodo_pago_check;

UPDATE pagos
SET metodo_pago = CASE
  WHEN metodo_pago IN ('Efectivo', 'EFECTIVO') THEN 'efectivo'
  WHEN metodo_pago IN ('Transferencia', 'TRANSFERENCIA') THEN 'transferencia'
  WHEN metodo_pago IN ('Tarjeta', 'TARJETA') THEN 'tarjeta'
  WHEN metodo_pago IN ('Cheque', 'CHEQUE') THEN 'cheque'
  WHEN metodo_pago IN ('efectivo', 'transferencia', 'tarjeta', 'cheque') THEN metodo_pago
  ELSE 'efectivo'
END;

ALTER TABLE pagos
ADD CONSTRAINT pagos_metodo_pago_check
CHECK (metodo_pago IN ('efectivo', 'transferencia', 'tarjeta', 'cheque'));
