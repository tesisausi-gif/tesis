-- ============================================
-- TABLA DE ESPECIALIDADES
-- ============================================
-- Catálogo de especialidades para técnicos

-- Crear tabla
CREATE TABLE IF NOT EXISTS public.especialidades (
  id_especialidad SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  esta_activa BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_modificacion TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- 1. Todos pueden ver especialidades activas
CREATE POLICY "especialidades_select_all" ON public.especialidades
  FOR SELECT
  USING (esta_activa = true);

-- 2. Solo admins pueden insertar
CREATE POLICY "especialidades_insert_admin" ON public.especialidades
  FOR INSERT
  WITH CHECK ((auth.jwt()->>'rol')::text = 'admin');

-- 3. Solo admins pueden actualizar
CREATE POLICY "especialidades_update_admin" ON public.especialidades
  FOR UPDATE
  USING ((auth.jwt()->>'rol')::text = 'admin')
  WITH CHECK ((auth.jwt()->>'rol')::text = 'admin');

-- 4. Solo admins pueden eliminar (soft delete preferido)
CREATE POLICY "especialidades_delete_admin" ON public.especialidades
  FOR DELETE
  USING ((auth.jwt()->>'rol')::text = 'admin');

-- Trigger para actualizar fecha_modificacion
CREATE OR REPLACE FUNCTION update_especialidades_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_especialidades_modtime
    BEFORE UPDATE ON public.especialidades
    FOR EACH ROW
    EXECUTE FUNCTION update_especialidades_modtime();

-- Índices
CREATE INDEX IF NOT EXISTS idx_especialidades_activa ON public.especialidades(esta_activa);
CREATE INDEX IF NOT EXISTS idx_especialidades_nombre ON public.especialidades(nombre);

-- ============================================
-- INSERTAR ESPECIALIDADES INICIALES
-- ============================================

INSERT INTO public.especialidades (nombre, descripcion) VALUES
('Plomería', 'Instalación y reparación de sistemas de agua y desagüe'),
('Electricidad', 'Instalación y mantenimiento de sistemas eléctricos'),
('Cerrajería', 'Instalación y reparación de cerraduras y sistemas de seguridad'),
('Pintura', 'Trabajos de pintura interior y exterior'),
('Albañilería', 'Construcción y reparación de estructuras de mampostería'),
('Carpintería', 'Fabricación e instalación de estructuras de madera'),
('Jardinería', 'Mantenimiento de áreas verdes y jardines'),
('Climatización', 'Instalación y mantenimiento de sistemas de aire acondicionado y calefacción'),
('Vidriería', 'Instalación y reparación de vidrios y ventanas'),
('Impermeabilización', 'Trabajos de impermeabilización de techos y estructuras'),
('Herrería', 'Fabricación e instalación de estructuras metálicas'),
('Gas', 'Instalación y mantenimiento de sistemas de gas'),
('Limpieza', 'Servicios de limpieza profunda y mantenimiento'),
('Fumigación', 'Control de plagas y fumigación'),
('General', 'Mantenimiento general y reparaciones varias')
ON CONFLICT (nombre) DO NOTHING;

-- Comentarios
COMMENT ON TABLE public.especialidades IS 'Catálogo de especialidades para técnicos';
COMMENT ON COLUMN public.especialidades.nombre IS 'Nombre de la especialidad (único)';
COMMENT ON COLUMN public.especialidades.esta_activa IS 'Si la especialidad está disponible para selección';

-- Verificación
SELECT id_especialidad, nombre, esta_activa
FROM public.especialidades
ORDER BY nombre;

-- Mensaje de éxito
SELECT 'Tabla de especialidades creada e inicializada correctamente' as mensaje;
