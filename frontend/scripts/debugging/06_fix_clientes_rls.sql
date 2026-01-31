-- ============================================
-- CONFIGURAR POLÍTICAS RLS PARA TABLA CLIENTES
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Admin y Gestor acceso total" ON public.clientes;
DROP POLICY IF EXISTS "Clientes ver solo sus datos" ON public.clientes;
DROP POLICY IF EXISTS "admin_gestor_all_clientes" ON public.clientes;
DROP POLICY IF EXISTS "clientes_view_own" ON public.clientes;

-- Habilitar RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Política 1: Admin y Gestor tienen acceso total
CREATE POLICY "admin_gestor_all_clientes"
ON public.clientes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol IN ('admin', 'gestor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol IN ('admin', 'gestor')
  )
);

-- Política 2: Clientes solo pueden ver sus propios datos
CREATE POLICY "clientes_view_own"
ON public.clientes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.id_cliente = clientes.id_cliente
  )
);
