-- ============================================
-- FIX: Políticas RLS sin Recursión Infinita
-- ============================================
-- Este script arregla el problema de recursión infinita
-- en las políticas de la tabla usuarios

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "Users can view own record" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update own record" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can view all" ON public.usuarios;
DROP POLICY IF EXISTS "Allow insert on signup" ON public.usuarios;

-- ============================================
-- NUEVAS POLÍTICAS SIN RECURSIÓN
-- ============================================

-- 1. Permitir INSERT durante el signup (sin verificar nada más)
CREATE POLICY "usuarios_insert_policy" ON public.usuarios
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Permitir SELECT: usuarios ven su propio registro
CREATE POLICY "usuarios_select_own" ON public.usuarios
  FOR SELECT
  USING (auth.uid() = id);

-- 3. Permitir SELECT para admins usando metadata del JWT
-- Esto evita la recursión porque usa auth.jwt() en lugar de consultar la tabla
CREATE POLICY "usuarios_select_admin" ON public.usuarios
  FOR SELECT
  USING (
    (auth.jwt()->>'rol')::text = 'admin'
  );

-- 4. Permitir UPDATE: usuarios pueden actualizar su propio registro
CREATE POLICY "usuarios_update_own" ON public.usuarios
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Permitir UPDATE para admins
CREATE POLICY "usuarios_update_admin" ON public.usuarios
  FOR UPDATE
  USING ((auth.jwt()->>'rol')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'rol')::text = 'admin');

-- 6. Permitir DELETE solo para admins
CREATE POLICY "usuarios_delete_admin" ON public.usuarios
  FOR DELETE
  USING ((auth.jwt()->>'rol')::text = 'admin');

-- ============================================
-- IMPORTANTE: Actualizar metadata al crear usuario
-- ============================================
-- Para que esto funcione, cuando crees un usuario debes
-- incluir el rol en user_metadata:
--
-- supabase.auth.signUp({
--   email: email,
--   password: password,
--   options: {
--     data: {
--       rol: 'admin'  // <-- Esto se guarda en JWT
--     }
--   }
-- })

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para verificar que las políticas funcionan:
-- SELECT * FROM usuarios;  -- Debería funcionar sin recursión
