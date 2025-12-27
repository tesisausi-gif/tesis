-- ============================================
-- REESTRUCTURAR TABLA PROPIEDADES -> INMUEBLES
-- ============================================
-- Cambios:
-- 1. Agregar columna id_cliente
-- 2. Migrar datos de id_propietario a id_cliente
-- 3. Eliminar columnas id_propietario e id_inquilino
-- 4. Renombrar tabla a inmuebles

-- Paso 1: Agregar columna id_cliente
ALTER TABLE public.propiedades
ADD COLUMN IF NOT EXISTS id_cliente INTEGER REFERENCES public.clientes(id_cliente);

-- Paso 2: Migrar datos - copiar id_propietario a id_cliente
-- (Los propietarios son los dueños principales de las propiedades)
UPDATE public.propiedades
SET id_cliente = id_propietario
WHERE id_propietario IS NOT NULL;

-- Si hay propiedades solo con inquilino (sin propietario), usar el inquilino
UPDATE public.propiedades
SET id_cliente = id_inquilino
WHERE id_cliente IS NULL AND id_inquilino IS NOT NULL;

-- Paso 3: Eliminar columnas antiguas
ALTER TABLE public.propiedades
DROP COLUMN IF EXISTS id_propietario,
DROP COLUMN IF EXISTS id_inquilino;

-- Paso 4: Renombrar tabla
ALTER TABLE public.propiedades
RENAME TO inmuebles;

-- Paso 5: Renombrar secuencia del ID
ALTER SEQUENCE IF EXISTS propiedades_id_propiedad_seq
RENAME TO inmuebles_id_inmueble_seq;

-- Paso 6: Renombrar columna id_propiedad a id_inmueble
ALTER TABLE public.inmuebles
RENAME COLUMN id_propiedad TO id_inmueble;

-- Paso 7: Renombrar constraint de primary key
ALTER TABLE public.inmuebles
RENAME CONSTRAINT propiedades_pkey TO inmuebles_pkey;

-- Paso 8: Actualizar comentarios
COMMENT ON TABLE public.inmuebles IS 'Tabla de inmuebles/propiedades de los clientes';
COMMENT ON COLUMN public.inmuebles.id_inmueble IS 'ID único del inmueble';
COMMENT ON COLUMN public.inmuebles.id_cliente IS 'ID del cliente dueño del inmueble';
COMMENT ON COLUMN public.inmuebles.tipo_propiedad IS 'Tipo de inmueble (casa, departamento, local, etc.)';
COMMENT ON COLUMN public.inmuebles.direccion_completa IS 'Dirección completa del inmueble';

-- Paso 9: Crear índice en id_cliente para mejor performance
CREATE INDEX IF NOT EXISTS idx_inmuebles_cliente ON public.inmuebles(id_cliente);

-- Paso 10: Hacer id_cliente NOT NULL (todas las propiedades deben tener un cliente)
ALTER TABLE public.inmuebles
ALTER COLUMN id_cliente SET NOT NULL;
