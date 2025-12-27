-- ============================================
-- ELIMINAR COLUMNA DIRECCION_COMPLETA DE INMUEBLES
-- ============================================
-- Ahora que tenemos campos estructurados (provincia, localidad, barrio,
-- calle, altura, piso, dpto), la columna direccion_completa es redundante.
-- La dirección se construirá dinámicamente cuando sea necesario mostrarla.

-- Eliminar columna direccion_completa
ALTER TABLE public.inmuebles
DROP COLUMN IF EXISTS direccion_completa;

-- Comentario
COMMENT ON TABLE public.inmuebles IS 'Tabla de inmuebles con dirección estructurada en campos separados';
