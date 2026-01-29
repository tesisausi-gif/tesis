-- Simplificar estados de asignación a valores en minúsculas
-- Eliminar constraint anterior y crear uno nuevo con valores simplificados

-- PASO 1: Eliminar el constraint anterior primero
ALTER TABLE asignaciones_tecnico
DROP CONSTRAINT IF EXISTS asignaciones_tecnico_estado_asignacion_check;

-- PASO 2: Actualizar los estados existentes en la tabla
UPDATE asignaciones_tecnico
SET estado_asignacion = CASE
  WHEN estado_asignacion IN ('Pendiente', 'PENDIENTE') THEN 'pendiente'
  WHEN estado_asignacion IN ('Aceptada', 'ACEPTADA') THEN 'aceptada'
  WHEN estado_asignacion IN ('Rechazada', 'RECHAZADA') THEN 'rechazada'
  WHEN estado_asignacion IN ('En Curso', 'EN_CURSO', 'En curso') THEN 'en_curso'
  WHEN estado_asignacion IN ('Completada', 'COMPLETADA') THEN 'completada'
  WHEN estado_asignacion IN ('pendiente', 'aceptada', 'rechazada', 'en_curso', 'completada') THEN estado_asignacion
  ELSE 'pendiente'
END;

-- PASO 3: Crear nuevo constraint con estados simplificados
ALTER TABLE asignaciones_tecnico
ADD CONSTRAINT asignaciones_tecnico_estado_asignacion_check
CHECK (estado_asignacion IN ('pendiente', 'aceptada', 'rechazada', 'en_curso', 'completada'));
