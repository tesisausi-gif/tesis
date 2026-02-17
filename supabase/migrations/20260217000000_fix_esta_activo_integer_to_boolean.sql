-- Migración: Convertir esta_activo de integer(0/1) a boolean en clientes, inmuebles y tecnicos
-- Las columnas estaban definidas como integer con CHECK (esta_activo = ANY (ARRAY[0, 1]))
-- lo cual causaba que .eq('esta_activo', true) desde Supabase JS no matcheara.

-- clientes
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_esta_activo_check;
ALTER TABLE clientes ALTER COLUMN esta_activo DROP DEFAULT;
ALTER TABLE clientes ALTER COLUMN esta_activo TYPE boolean USING (esta_activo = 1);
ALTER TABLE clientes ALTER COLUMN esta_activo SET DEFAULT true;

-- inmuebles
ALTER TABLE inmuebles DROP CONSTRAINT IF EXISTS propiedades_esta_activo_check;
ALTER TABLE inmuebles ALTER COLUMN esta_activo DROP DEFAULT;
ALTER TABLE inmuebles ALTER COLUMN esta_activo TYPE boolean USING (esta_activo = 1);
ALTER TABLE inmuebles ALTER COLUMN esta_activo SET DEFAULT true;

-- tecnicos
ALTER TABLE tecnicos DROP CONSTRAINT IF EXISTS tecnicos_esta_activo_check;
ALTER TABLE tecnicos ALTER COLUMN esta_activo DROP DEFAULT;
ALTER TABLE tecnicos ALTER COLUMN esta_activo TYPE boolean USING (esta_activo = 1);
ALTER TABLE tecnicos ALTER COLUMN esta_activo SET DEFAULT true;
