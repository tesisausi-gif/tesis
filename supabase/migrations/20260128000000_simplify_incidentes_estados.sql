-- Simplificar estados de incidente a solo 3 valores
-- Eliminar constraint anterior y crear uno nuevo con valores simplificados

-- PASO 1: Eliminar el constraint anterior primero
ALTER TABLE incidentes
DROP CONSTRAINT IF EXISTS incidentes_estado_actual_check;

-- PASO 2: Actualizar los estados existentes en la tabla
UPDATE incidentes
SET estado_actual = CASE
  WHEN estado_actual IN ('registrado', 'en_evaluacion', 'reportado', 'Reportado', 'En Evaluación') THEN 'pendiente'
  WHEN estado_actual IN ('asignado', 'en_ejecucion', 'aprobado', 'pendiente_aprobacion', 'Asignado', 'En Proceso', 'En Ejecución', 'Aprobado', 'Esperando Aprobación') THEN 'en_proceso'
  WHEN estado_actual IN ('finalizado', 'cerrado', 'Finalizado', 'Cerrado') THEN 'resuelto'
  WHEN estado_actual IN ('pendiente', 'en_proceso', 'resuelto') THEN estado_actual
  ELSE 'pendiente'
END;

-- PASO 3: Crear nuevo constraint con solo 3 estados simplificados
ALTER TABLE incidentes
ADD CONSTRAINT incidentes_estado_actual_check
CHECK (estado_actual IN ('pendiente', 'en_proceso', 'resuelto'));
