-- Tabla de Conformidades
-- El admin crea la conformidad cuando el trabajo es completado.
-- El cliente la firma digitalmente para confirmar satisfacción con el trabajo.

CREATE TABLE IF NOT EXISTS conformidades (
  id_conformidad    SERIAL PRIMARY KEY,
  id_incidente      INTEGER NOT NULL REFERENCES incidentes(id_incidente) ON DELETE CASCADE,
  id_cliente        INTEGER NOT NULL REFERENCES clientes(id_cliente),
  descripcion_trabajo TEXT,
  esta_firmada      BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_firma       TIMESTAMPTZ,
  observaciones     TEXT,
  fecha_creacion    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE conformidades ENABLE ROW LEVEL SECURITY;

-- Admins/gestores: acceso total
CREATE POLICY "admin_all_conformidades" ON conformidades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin', 'gestor')
    )
  );

-- Clientes: ven sus propias conformidades y pueden actualizarlas (para firmar)
CREATE POLICY "cliente_select_conformidades" ON conformidades
  FOR SELECT USING (
    id_cliente IN (
      SELECT id_cliente FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "cliente_update_conformidades" ON conformidades
  FOR UPDATE USING (
    id_cliente IN (
      SELECT id_cliente FROM clientes WHERE id = auth.uid()
    )
  );

-- Técnicos: ven conformidades de sus incidentes asignados
CREATE POLICY "tecnico_select_conformidades" ON conformidades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM asignaciones_tecnico at2
      JOIN tecnicos t ON t.id_tecnico = at2.id_tecnico
      WHERE at2.id_incidente = conformidades.id_incidente
        AND t.id = auth.uid()
    )
  );
