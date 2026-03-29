-- Migración: Soporte para múltiples especialidades por técnico
-- Agrega columna `especialidades text[]` a tecnicos y solicitudes_registro
-- La columna `especialidad` (singular) se mantiene como la "primaria" (especialidades[0])
-- para compatibilidad con el código existente.

-- 1. Agregar columna a tecnicos
ALTER TABLE tecnicos
  ADD COLUMN IF NOT EXISTS especialidades text[] NOT NULL DEFAULT '{}';

-- Migrar datos existentes: si ya tiene especialidad, moverla al array
UPDATE tecnicos
  SET especialidades = ARRAY[especialidad]
  WHERE especialidad IS NOT NULL
    AND especialidad != ''
    AND cardinality(especialidades) = 0;

-- 2. Agregar columna a solicitudes_registro
ALTER TABLE solicitudes_registro
  ADD COLUMN IF NOT EXISTS especialidades text[] NOT NULL DEFAULT '{}';

-- Migrar datos existentes
UPDATE solicitudes_registro
  SET especialidades = ARRAY[especialidad]
  WHERE especialidad IS NOT NULL
    AND especialidad != ''
    AND cardinality(especialidades) = 0;
