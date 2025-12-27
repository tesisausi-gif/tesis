-- ============================================
-- Corregir políticas RLS para tabla tecnicos
-- ============================================

-- Primero, eliminar todas las políticas existentes de la tabla tecnicos
DROP POLICY IF EXISTS "Admins can view all tecnicos" ON tecnicos;
DROP POLICY IF EXISTS "Admins can insert tecnicos" ON tecnicos;
DROP POLICY IF EXISTS "Admins can update tecnicos" ON tecnicos;
DROP POLICY IF EXISTS "Admins can delete tecnicos" ON tecnicos;
DROP POLICY IF EXISTS "Tecnicos can view own record" ON tecnicos;
DROP POLICY IF EXISTS "Tecnicos can update own record" ON tecnicos;

-- Asegurar que RLS esté habilitado
ALTER TABLE tecnicos ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: Los administradores pueden ver todos los técnicos
CREATE POLICY "Admins can view all tecnicos"
ON tecnicos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- POLÍTICA 2: Los administradores pueden insertar técnicos
CREATE POLICY "Admins can insert tecnicos"
ON tecnicos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- POLÍTICA 3: Los administradores pueden actualizar técnicos
CREATE POLICY "Admins can update tecnicos"
ON tecnicos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- POLÍTICA 4: Los administradores pueden eliminar técnicos
CREATE POLICY "Admins can delete tecnicos"
ON tecnicos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- POLÍTICA 5: Los técnicos pueden ver su propio registro
CREATE POLICY "Tecnicos can view own record"
ON tecnicos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.id_tecnico = tecnicos.id_tecnico
  )
);

-- POLÍTICA 6: Los técnicos pueden actualizar su propio registro
CREATE POLICY "Tecnicos can update own record"
ON tecnicos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.id_tecnico = tecnicos.id_tecnico
  )
);

-- ============================================
-- Verificación (comentado - solo para referencia)
-- ============================================
-- Para verificar que las políticas se crearon correctamente:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'tecnicos';
