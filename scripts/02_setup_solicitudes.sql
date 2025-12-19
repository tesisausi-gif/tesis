-- ============================================
-- TABLA DE SOLICITUDES DE REGISTRO
-- ============================================
-- Esta tabla almacena las solicitudes de registro de técnicos
-- que deben ser aprobadas por gestores o administradores

CREATE TABLE IF NOT EXISTS public.solicitudes_registro (
  id_solicitud SERIAL PRIMARY KEY,
  nombre VARCHAR NOT NULL,
  apellido VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  telefono VARCHAR,
  dni VARCHAR,
  especialidad VARCHAR,
  direccion VARCHAR,
  estado_solicitud VARCHAR NOT NULL DEFAULT 'pendiente' CHECK (estado_solicitud IN ('pendiente', 'aprobada', 'rechazada')),
  motivo_rechazo TEXT,
  id_aprobado_por UUID REFERENCES usuarios(id),
  fecha_solicitud TIMESTAMP DEFAULT NOW(),
  fecha_aprobacion TIMESTAMP,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_modificacion TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON public.solicitudes_registro(estado_solicitud);
CREATE INDEX IF NOT EXISTS idx_solicitudes_email ON public.solicitudes_registro(email);

-- Trigger para actualizar fecha_modificacion
CREATE TRIGGER update_solicitudes_modtime
    BEFORE UPDATE ON public.solicitudes_registro
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- RLS (Row Level Security)
ALTER TABLE public.solicitudes_registro ENABLE ROW LEVEL SECURITY;

-- Política: Admin y gestores pueden ver todas las solicitudes
CREATE POLICY "Admin y gestores ven todas las solicitudes" ON public.solicitudes_registro
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol IN ('admin', 'gestor')
    )
  );

-- Política: Admin y gestores pueden actualizar solicitudes
CREATE POLICY "Admin y gestores actualizan solicitudes" ON public.solicitudes_registro
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol IN ('admin', 'gestor')
    )
  );

-- Política: Cualquiera puede insertar solicitudes (registro público)
CREATE POLICY "Permitir insertar solicitudes" ON public.solicitudes_registro
  FOR INSERT WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE public.solicitudes_registro IS 'Solicitudes de registro de técnicos pendientes de aprobación';
COMMENT ON COLUMN public.solicitudes_registro.estado_solicitud IS 'Estado: pendiente, aprobada, rechazada';
