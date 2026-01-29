-- Simplificar estados de presupuesto a valores en minúsculas sin espacios

-- PASO 1: Eliminar el constraint anterior
ALTER TABLE presupuestos
DROP CONSTRAINT IF EXISTS presupuestos_estado_presupuesto_check;

-- PASO 2: Actualizar los estados existentes
UPDATE presupuestos
SET estado_presupuesto = CASE
  WHEN estado_presupuesto IN ('Borrador', 'BORRADOR') THEN 'borrador'
  WHEN estado_presupuesto IN ('Enviado', 'ENVIADO') THEN 'enviado'
  WHEN estado_presupuesto IN ('Aprobado Admin', 'APROBADO_ADMIN', 'aprobado_admin') THEN 'aprobado_admin'
  WHEN estado_presupuesto IN ('Aprobado', 'APROBADO') THEN 'aprobado'
  WHEN estado_presupuesto IN ('Rechazado', 'RECHAZADO') THEN 'rechazado'
  WHEN estado_presupuesto IN ('Vencido', 'VENCIDO') THEN 'vencido'
  WHEN estado_presupuesto IN ('borrador', 'enviado', 'aprobado_admin', 'aprobado', 'rechazado', 'vencido') THEN estado_presupuesto
  ELSE 'borrador'
END;

-- PASO 3: Crear nuevo constraint
ALTER TABLE presupuestos
ADD CONSTRAINT presupuestos_estado_presupuesto_check
CHECK (estado_presupuesto IN ('borrador', 'enviado', 'aprobado_admin', 'aprobado', 'rechazado', 'vencido'));
