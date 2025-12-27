-- ============================================
-- ELIMINAR COLUMNA tipo_cliente DE LA TABLA clientes
-- ============================================

-- Eliminar la columna tipo_cliente
ALTER TABLE public.clientes
DROP COLUMN IF EXISTS tipo_cliente;

-- Comentario
COMMENT ON TABLE public.clientes IS 'Tabla de clientes del sistema - columna tipo_cliente eliminada';
