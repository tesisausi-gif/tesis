-- ============================================
-- FIX: POLÍTICAS RLS SIMPLIFICADAS PARA CLIENTES
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Admins pueden ver todos los clientes" ON public.clientes;
DROP POLICY IF EXISTS "Gestores pueden ver todos los clientes" ON public.clientes;
DROP POLICY IF EXISTS "Clientes pueden ver su propio registro" ON public.clientes;
DROP POLICY IF EXISTS "Admins pueden insertar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins pueden actualizar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins pueden eliminar clientes" ON public.clientes;

-- Política simplificada: Admin y Gestor pueden hacer TODO
CREATE POLICY "Admin y Gestor acceso total" ON public.clientes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol IN ('admin', 'gestor')
    )
  );

-- Política: Clientes solo ven su propio registro
CREATE POLICY "Clientes ven su registro" ON public.clientes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'cliente'
        AND usuarios.id_cliente = clientes.id_cliente
    )
  );

COMMENT ON POLICY "Admin y Gestor acceso total" ON public.clientes
  IS 'Permite a admin y gestor ver, crear, actualizar y eliminar todos los clientes';
COMMENT ON POLICY "Clientes ven su registro" ON public.clientes
  IS 'Permite a los clientes ver solo su propio registro';
