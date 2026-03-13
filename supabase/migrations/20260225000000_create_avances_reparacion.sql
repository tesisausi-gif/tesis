-- Tabla de Avances de Reparación
-- El técnico registra el progreso del trabajo para que admin y cliente puedan seguirlo

CREATE TABLE IF NOT EXISTS avances_reparacion (
  id_avance           SERIAL PRIMARY KEY,
  id_incidente        INTEGER NOT NULL REFERENCES incidentes(id_incidente) ON DELETE CASCADE,
  id_tecnico          INTEGER NOT NULL REFERENCES tecnicos(id_tecnico),
  descripcion         TEXT NOT NULL,
  porcentaje_avance   INTEGER CHECK (porcentaje_avance BETWEEN 0 AND 100),
  fotos_url           TEXT[],
  fecha_avance        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE avances_reparacion ENABLE ROW LEVEL SECURITY;

-- Técnicos pueden ver y crear avances de sus propios incidentes
CREATE POLICY "tecnicos_select_avances" ON avances_reparacion
  FOR SELECT USING (
    id_tecnico IN (
      SELECT id_tecnico FROM tecnicos WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM incidentes i
      JOIN clientes c ON c.id_cliente = i.id_cliente_reporta
      WHERE i.id_incidente = avances_reparacion.id_incidente
        AND c.id = auth.uid()
    )
  );

CREATE POLICY "tecnicos_insert_avances" ON avances_reparacion
  FOR INSERT WITH CHECK (
    id_tecnico IN (
      SELECT id_tecnico FROM tecnicos WHERE id = auth.uid()
    )
  );

CREATE POLICY "tecnicos_delete_avances" ON avances_reparacion
  FOR DELETE USING (
    id_tecnico IN (
      SELECT id_tecnico FROM tecnicos WHERE id = auth.uid()
    )
  );

-- Admins/gestores ven todos los avances
CREATE POLICY "admin_all_avances" ON avances_reparacion
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin', 'gestor')
    )
  );
