-- ============================================
-- Configurar ON DELETE CASCADE para técnicos
-- ============================================
-- Este script modifica las foreign keys relacionadas con tecnicos
-- para que cuando se elimine un técnico, se eliminen todas sus referencias

-- 1. Tabla usuarios
-- Primero, encontrar y eliminar la constraint existente
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Buscar el nombre de la constraint
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints
    WHERE table_name = 'usuarios'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%id_tecnico%';

    -- Si existe, eliminarla
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE usuarios DROP CONSTRAINT %I', constraint_name_var);
    END IF;
END $$;

-- Agregar la nueva constraint con ON DELETE CASCADE
ALTER TABLE usuarios
ADD CONSTRAINT usuarios_id_tecnico_fkey
FOREIGN KEY (id_tecnico)
REFERENCES tecnicos(id_tecnico)
ON DELETE CASCADE;

-- 2. Tabla asignaciones_tecnico
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints
    WHERE table_name = 'asignaciones_tecnico'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%id_tecnico%';

    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE asignaciones_tecnico DROP CONSTRAINT %I', constraint_name_var);
    END IF;
END $$;

ALTER TABLE asignaciones_tecnico
ADD CONSTRAINT asignaciones_tecnico_id_tecnico_fkey
FOREIGN KEY (id_tecnico)
REFERENCES tecnicos(id_tecnico)
ON DELETE CASCADE;

-- 3. Tabla inspecciones
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints
    WHERE table_name = 'inspecciones'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%id_tecnico%';

    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE inspecciones DROP CONSTRAINT %I', constraint_name_var);
    END IF;
END $$;

ALTER TABLE inspecciones
ADD CONSTRAINT inspecciones_id_tecnico_fkey
FOREIGN KEY (id_tecnico)
REFERENCES tecnicos(id_tecnico)
ON DELETE CASCADE;

-- 4. Tabla calificaciones
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints
    WHERE table_name = 'calificaciones'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%id_tecnico%';

    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE calificaciones DROP CONSTRAINT %I', constraint_name_var);
    END IF;
END $$;

ALTER TABLE calificaciones
ADD CONSTRAINT calificaciones_id_tecnico_fkey
FOREIGN KEY (id_tecnico)
REFERENCES tecnicos(id_tecnico)
ON DELETE CASCADE;

-- ============================================
-- Verificación
-- ============================================
-- Ejecuta esta query para verificar que las constraints fueron creadas correctamente:
-- SELECT
--     tc.table_name,
--     kcu.column_name,
--     rc.delete_rule
-- FROM
--     information_schema.table_constraints AS tc
--     JOIN information_schema.key_column_usage AS kcu
--       ON tc.constraint_name = kcu.constraint_name
--     JOIN information_schema.referential_constraints AS rc
--       ON rc.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND kcu.column_name = 'id_tecnico'
--   AND tc.table_schema = 'public';
