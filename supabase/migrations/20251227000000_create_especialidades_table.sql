-- Crear tabla especialidades
CREATE TABLE IF NOT EXISTS public.especialidades (
  id_especialidad SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  esta_activa BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX idx_especialidades_nombre ON public.especialidades(nombre);
CREATE INDEX idx_especialidades_activa ON public.especialidades(esta_activa);

-- Insertar especialidades comunes
INSERT INTO public.especialidades (nombre, descripcion) VALUES
  ('Plomería', 'Instalación y reparación de sistemas de agua y desagüe'),
  ('Electricidad', 'Instalación y reparación de sistemas eléctricos'),
  ('Albañilería', 'Trabajos de construcción y mampostería'),
  ('Carpintería', 'Trabajos en madera, puertas, ventanas y muebles'),
  ('Pintura', 'Trabajos de pintura interior y exterior'),
  ('Cerrajería', 'Instalación y reparación de cerraduras y sistemas de seguridad'),
  ('Climatización', 'Instalación y reparación de sistemas de aire acondicionado y calefacción'),
  ('Vidriería', 'Instalación y reparación de vidrios y espejos'),
  ('Gas', 'Instalación y reparación de sistemas de gas'),
  ('Fumigación', 'Control de plagas')
ON CONFLICT (nombre) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: todos pueden ver especialidades activas, solo admins pueden modificar
CREATE POLICY "Cualquiera puede ver especialidades activas"
  ON public.especialidades
  FOR SELECT
  USING (esta_activa = true OR EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  ));

CREATE POLICY "Solo admins pueden insertar especialidades"
  ON public.especialidades
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  ));

CREATE POLICY "Solo admins pueden actualizar especialidades"
  ON public.especialidades
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  ));

-- Agregar FK a la tabla tecnicos si el campo especialidad será id_especialidad
-- (Esto es opcional, se puede hacer después de migrar los datos)
-- ALTER TABLE public.tecnicos ADD COLUMN id_especialidad INTEGER REFERENCES public.especialidades(id_especialidad);
