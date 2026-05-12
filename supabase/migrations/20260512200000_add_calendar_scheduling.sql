-- Tabla de franjas de disponibilidad del cliente
-- El cliente marca los días y horarios en que puede recibir al técnico
CREATE TABLE public.franjas_disponibilidad (
  id_franja       SERIAL PRIMARY KEY,
  id_incidente    INTEGER NOT NULL REFERENCES public.incidentes(id_incidente) ON DELETE CASCADE,
  fecha           DATE    NOT NULL,
  hora_inicio     TIME    NOT NULL,
  hora_fin        TIME    NOT NULL,
  fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hora_valida CHECK (hora_fin > hora_inicio)
);

CREATE INDEX idx_franjas_incidente ON public.franjas_disponibilidad(id_incidente);
CREATE INDEX idx_franjas_fecha     ON public.franjas_disponibilidad(fecha);

-- Tabla de compromisos de visita del técnico
-- El técnico confirma en qué franja va a ir, con duración estimada
CREATE TABLE public.compromisos_tecnico (
  id_compromiso      SERIAL PRIMARY KEY,
  id_asignacion      INTEGER NOT NULL REFERENCES public.asignaciones_tecnico(id_asignacion) ON DELETE CASCADE,
  id_incidente       INTEGER NOT NULL REFERENCES public.incidentes(id_incidente) ON DELETE CASCADE,
  id_tecnico         INTEGER NOT NULL REFERENCES public.tecnicos(id_tecnico)     ON DELETE CASCADE,
  fecha_visita       DATE    NOT NULL,
  hora_inicio        TIME    NOT NULL,
  hora_fin_estimada  TIME    NOT NULL,
  estado             TEXT    NOT NULL DEFAULT 'programado'
                     CHECK (estado IN ('programado', 'completado', 'cancelado')),
  fecha_creacion     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hora_compromiso_valida CHECK (hora_fin_estimada > hora_inicio)
);

CREATE INDEX idx_compromisos_tecnico_estado ON public.compromisos_tecnico(id_tecnico, estado);
CREATE INDEX idx_compromisos_incidente      ON public.compromisos_tecnico(id_incidente);
CREATE INDEX idx_compromisos_fecha          ON public.compromisos_tecnico(fecha_visita);

-- UNIQUE: un técnico solo puede tener un compromiso activo por asignacion
CREATE UNIQUE INDEX idx_compromisos_asignacion_activo
  ON public.compromisos_tecnico(id_asignacion)
  WHERE estado = 'programado';
