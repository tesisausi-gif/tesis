-- Tabla de visitas programadas por el técnico
-- Soporta múltiples visitas por incidente (inspección inicial + visitas de seguimiento).
-- El campo fuera_de_disponibilidad indica si el técnico propuso un horario que
-- no coincide con las franjas declaradas por el cliente — habilita el botón de rechazo.
CREATE TABLE public.visitas (
  id_visita               SERIAL PRIMARY KEY,
  id_incidente            INTEGER NOT NULL REFERENCES public.incidentes(id_incidente) ON DELETE CASCADE,
  id_tecnico              INTEGER NOT NULL REFERENCES public.tecnicos(id_tecnico)     ON DELETE CASCADE,
  tipo                    TEXT    NOT NULL DEFAULT 'inspeccion'
                            CHECK (tipo IN ('inspeccion', 'reparacion', 'seguimiento')),
  fecha_visita            DATE    NOT NULL,
  hora_inicio             TIME    NOT NULL,
  hora_fin_estimada       TIME,
  estado                  TEXT    NOT NULL DEFAULT 'propuesta'
                            CHECK (estado IN ('propuesta', 'confirmada', 'completada', 'cancelada', 'rechazada')),
  fuera_de_disponibilidad BOOLEAN NOT NULL DEFAULT FALSE,
  notas_tecnico           TEXT,
  motivo_rechazo          TEXT,
  fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hora_visita_valida CHECK (hora_fin_estimada IS NULL OR hora_fin_estimada > hora_inicio)
);

CREATE INDEX idx_visitas_incidente ON public.visitas(id_incidente);
CREATE INDEX idx_visitas_tecnico   ON public.visitas(id_tecnico);
CREATE INDEX idx_visitas_estado    ON public.visitas(estado);
CREATE INDEX idx_visitas_fecha     ON public.visitas(fecha_visita);
