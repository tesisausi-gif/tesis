-- ============================================
-- CREAR TABLA TIPOS_INMUEBLES Y ACTUALIZAR INMUEBLES
-- ============================================

-- Paso 1: Crear tabla tipos_inmuebles
CREATE TABLE IF NOT EXISTS public.tipos_inmuebles (
  id_tipo_inmueble SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  esta_activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_modificacion TIMESTAMP DEFAULT NOW()
);

-- Paso 2: Insertar tipos iniciales
INSERT INTO public.tipos_inmuebles (nombre, descripcion) VALUES
  ('Casa', 'Casa unifamiliar o multifamiliar'),
  ('Departamento', 'Unidad en edificio de propiedad horizontal'),
  ('Duplex', 'Vivienda de dos plantas'),
  ('Local Comercial', 'Espacio destinado a actividad comercial')
ON CONFLICT (nombre) DO NOTHING;

-- Paso 3: Agregar nuevas columnas a tabla inmuebles
ALTER TABLE public.inmuebles
  ADD COLUMN IF NOT EXISTS id_tipo_inmueble INTEGER REFERENCES public.tipos_inmuebles(id_tipo_inmueble),
  ADD COLUMN IF NOT EXISTS provincia VARCHAR(100),
  ADD COLUMN IF NOT EXISTS localidad VARCHAR(100),
  ADD COLUMN IF NOT EXISTS barrio VARCHAR(100),
  ADD COLUMN IF NOT EXISTS calle VARCHAR(200),
  ADD COLUMN IF NOT EXISTS altura VARCHAR(20),
  ADD COLUMN IF NOT EXISTS piso VARCHAR(10),
  ADD COLUMN IF NOT EXISTS dpto VARCHAR(10);

-- Paso 4: Renombrar columna descripcion a informacion_adicional
ALTER TABLE public.inmuebles
  RENAME COLUMN descripcion TO informacion_adicional;

-- Paso 5: Migrar datos existentes de tipo_propiedad a id_tipo_inmueble
-- Si había datos en tipo_propiedad, intentamos matchearlos
UPDATE public.inmuebles i
SET id_tipo_inmueble = ti.id_tipo_inmueble
FROM public.tipos_inmuebles ti
WHERE LOWER(i.tipo_propiedad) = LOWER(ti.nombre)
  AND i.id_tipo_inmueble IS NULL;

-- Paso 6: Para registros sin match, usar "Casa" por defecto
UPDATE public.inmuebles
SET id_tipo_inmueble = (SELECT id_tipo_inmueble FROM public.tipos_inmuebles WHERE nombre = 'Casa')
WHERE id_tipo_inmueble IS NULL;

-- Paso 7: Ahora que todos tienen un tipo, hacemos la columna NOT NULL
ALTER TABLE public.inmuebles
  ALTER COLUMN id_tipo_inmueble SET NOT NULL;

-- Paso 8: Ya no necesitamos tipo_propiedad (lo tenemos en la relación)
ALTER TABLE public.inmuebles
  DROP COLUMN IF EXISTS tipo_propiedad;

-- Paso 9: Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_inmuebles_tipo ON public.inmuebles(id_tipo_inmueble);
CREATE INDEX IF NOT EXISTS idx_inmuebles_provincia ON public.inmuebles(provincia);
CREATE INDEX IF NOT EXISTS idx_inmuebles_localidad ON public.inmuebles(localidad);

-- Paso 10: Trigger para actualizar fecha_modificacion en tipos_inmuebles
CREATE OR REPLACE FUNCTION update_tipos_inmuebles_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tipos_inmuebles_modtime
    BEFORE UPDATE ON public.tipos_inmuebles
    FOR EACH ROW
    EXECUTE FUNCTION update_tipos_inmuebles_modified_column();

-- Paso 11: Comentarios
COMMENT ON TABLE public.tipos_inmuebles IS 'Catálogo de tipos de inmuebles';
COMMENT ON COLUMN public.inmuebles.id_tipo_inmueble IS 'Tipo de inmueble (Casa, Depto, etc)';
COMMENT ON COLUMN public.inmuebles.provincia IS 'Provincia del inmueble';
COMMENT ON COLUMN public.inmuebles.localidad IS 'Localidad/Ciudad del inmueble';
COMMENT ON COLUMN public.inmuebles.barrio IS 'Barrio del inmueble';
COMMENT ON COLUMN public.inmuebles.calle IS 'Nombre de la calle';
COMMENT ON COLUMN public.inmuebles.altura IS 'Número de calle';
COMMENT ON COLUMN public.inmuebles.piso IS 'Número de piso (para deptos)';
COMMENT ON COLUMN public.inmuebles.dpto IS 'Número de departamento';
COMMENT ON COLUMN public.inmuebles.informacion_adicional IS 'Información adicional del inmueble';

-- Paso 12: Habilitar RLS en tipos_inmuebles
ALTER TABLE public.tipos_inmuebles ENABLE ROW LEVEL SECURITY;

-- Paso 13: Política RLS para tipos_inmuebles (todos pueden leer los activos)
CREATE POLICY "Todos pueden ver tipos activos" ON public.tipos_inmuebles
  FOR SELECT
  USING (esta_activo = true);

-- Paso 14: Solo admins pueden modificar tipos
CREATE POLICY "Solo admins modifican tipos" ON public.tipos_inmuebles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );
