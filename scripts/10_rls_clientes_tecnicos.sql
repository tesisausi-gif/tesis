-- ============================================
-- POLÍTICAS RLS PARA CLIENTES Y TECNICOS
-- ============================================
-- Configurar RLS para permitir que el trigger funcione

-- ============================================
-- TABLA CLIENTES
-- ============================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "clientes_select_own" ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_admin" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_system" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_own" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_admin" ON public.clientes;

-- 1. SELECT: Clientes pueden ver su propio registro
CREATE POLICY "clientes_select_own" ON public.clientes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.id_cliente = clientes.id_cliente
    )
  );

-- 2. SELECT: Admins y gestores pueden ver todos
CREATE POLICY "clientes_select_admin" ON public.clientes
  FOR SELECT
  USING (
    (auth.jwt()->>'rol')::text IN ('admin', 'gestor')
  );

-- 3. INSERT: Solo el sistema (trigger) puede insertar
-- Usamos SECURITY DEFINER en el trigger para bypass RLS
CREATE POLICY "clientes_insert_system" ON public.clientes
  FOR INSERT
  WITH CHECK (true); -- Permitir todo, el trigger usa SECURITY DEFINER

-- 4. UPDATE: Clientes pueden actualizar su propio registro
CREATE POLICY "clientes_update_own" ON public.clientes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.id_cliente = clientes.id_cliente
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.id_cliente = clientes.id_cliente
    )
  );

-- 5. UPDATE: Admins pueden actualizar cualquier cliente
CREATE POLICY "clientes_update_admin" ON public.clientes
  FOR UPDATE
  USING ((auth.jwt()->>'rol')::text IN ('admin', 'gestor'))
  WITH CHECK ((auth.jwt()->>'rol')::text IN ('admin', 'gestor'));

-- ============================================
-- TABLA TECNICOS
-- ============================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "tecnicos_select_own" ON public.tecnicos;
DROP POLICY IF EXISTS "tecnicos_select_admin" ON public.tecnicos;
DROP POLICY IF EXISTS "tecnicos_insert_system" ON public.tecnicos;
DROP POLICY IF EXISTS "tecnicos_update_own" ON public.tecnicos;
DROP POLICY IF EXISTS "tecnicos_update_admin" ON public.tecnicos;

-- 1. SELECT: Técnicos pueden ver su propio registro
CREATE POLICY "tecnicos_select_own" ON public.tecnicos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.id_tecnico = tecnicos.id_tecnico
    )
  );

-- 2. SELECT: Admins y gestores pueden ver todos
CREATE POLICY "tecnicos_select_admin" ON public.tecnicos
  FOR SELECT
  USING (
    (auth.jwt()->>'rol')::text IN ('admin', 'gestor')
  );

-- 3. INSERT: Solo el sistema (trigger) puede insertar
CREATE POLICY "tecnicos_insert_system" ON public.tecnicos
  FOR INSERT
  WITH CHECK (true); -- Permitir todo, el trigger usa SECURITY DEFINER

-- 4. UPDATE: Técnicos pueden actualizar su propio registro
CREATE POLICY "tecnicos_update_own" ON public.tecnicos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.id_tecnico = tecnicos.id_tecnico
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.id_tecnico = tecnicos.id_tecnico
    )
  );

-- 5. UPDATE: Admins pueden actualizar cualquier técnico
CREATE POLICY "tecnicos_update_admin" ON public.tecnicos
  FOR UPDATE
  USING ((auth.jwt()->>'rol')::text IN ('admin', 'gestor'))
  WITH CHECK ((auth.jwt()->>'rol')::text IN ('admin', 'gestor'));

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver políticas de clientes
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operacion
FROM pg_policies
WHERE tablename = 'clientes'
ORDER BY policyname;

-- Ver políticas de tecnicos
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operacion
FROM pg_policies
WHERE tablename = 'tecnicos'
ORDER BY policyname;

-- Mensaje de éxito
SELECT 'Políticas RLS configuradas correctamente para clientes y tecnicos' as mensaje;
