-- ============================================
-- ROW LEVEL SECURITY PARA TABLA CLIENTES
-- ============================================

-- Habilitar RLS en la tabla clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS DE SEGURIDAD
-- ============================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Admins pueden ver todos los clientes" ON public.clientes;
DROP POLICY IF EXISTS "Gestores pueden ver todos los clientes" ON public.clientes;
DROP POLICY IF EXISTS "Clientes pueden ver su propio registro" ON public.clientes;
DROP POLICY IF EXISTS "Admins pueden insertar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins pueden actualizar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins pueden eliminar clientes" ON public.clientes;

-- Política: Admins pueden ver todos los clientes
CREATE POLICY "Admins pueden ver todos los clientes" ON public.clientes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Política: Gestores pueden ver todos los clientes
CREATE POLICY "Gestores pueden ver todos los clientes" ON public.clientes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol IN ('admin', 'gestor')
    )
  );

-- Política: Clientes pueden ver su propio registro
CREATE POLICY "Clientes pueden ver su propio registro" ON public.clientes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid()
        AND rol = 'cliente'
        AND id_cliente = clientes.id_cliente
    )
  );

-- Política: Admins pueden insertar clientes
CREATE POLICY "Admins pueden insertar clientes" ON public.clientes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Política: Admins pueden actualizar clientes
CREATE POLICY "Admins pueden actualizar clientes" ON public.clientes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Política: Admins pueden eliminar clientes
CREATE POLICY "Admins pueden eliminar clientes" ON public.clientes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON POLICY "Admins pueden ver todos los clientes" ON public.clientes
  IS 'Permite a los administradores ver todos los clientes';
COMMENT ON POLICY "Gestores pueden ver todos los clientes" ON public.clientes
  IS 'Permite a los gestores ver todos los clientes';
COMMENT ON POLICY "Clientes pueden ver su propio registro" ON public.clientes
  IS 'Permite a los clientes ver solo su propio registro';
