-- Habilitar RLS en solicitudes_registro si no está habilitado
ALTER TABLE solicitudes_registro ENABLE ROW LEVEL SECURITY;

-- Política para que los admins puedan ver todas las solicitudes
CREATE POLICY IF NOT EXISTS "Admins pueden ver solicitudes"
ON solicitudes_registro
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- Política para que los admins puedan actualizar solicitudes (aprobar/rechazar)
CREATE POLICY IF NOT EXISTS "Admins pueden actualizar solicitudes"
ON solicitudes_registro
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- Política para que cualquier usuario anónimo pueda crear solicitudes (registro)
CREATE POLICY IF NOT EXISTS "Usuarios anónimos pueden crear solicitudes"
ON solicitudes_registro
FOR INSERT
TO anon
WITH CHECK (true);

-- También permitir a usuarios autenticados crear solicitudes
CREATE POLICY IF NOT EXISTS "Usuarios autenticados pueden crear solicitudes"
ON solicitudes_registro
FOR INSERT
TO authenticated
WITH CHECK (true);
