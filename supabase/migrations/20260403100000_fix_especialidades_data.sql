-- Corregir datos de la tabla especialidades:
-- 1. Agregar especialidades faltantes (Herrería, Otros y otras del seed original)
-- 2. Desactivar cualquier especialidad que no esté en la lista válida (ej: registros de prueba)
-- 3. Reactivar todas las válidas por si alguna fue desactivada

INSERT INTO public.especialidades (nombre, descripcion, esta_activa) VALUES
  ('Plomería',      'Instalación y reparación de sistemas de agua y desagüe',          true),
  ('Electricidad',  'Instalación y reparación de sistemas eléctricos',                  true),
  ('Albañilería',   'Trabajos de construcción y mampostería',                           true),
  ('Carpintería',   'Trabajos en madera, puertas, ventanas y muebles',                 true),
  ('Pintura',       'Trabajos de pintura interior y exterior',                          true),
  ('Herrería',      'Trabajos en hierro, rejas, portones y estructuras metálicas',      true),
  ('Cerrajería',    'Instalación y reparación de cerraduras y sistemas de seguridad',   true),
  ('Climatización', 'Instalación y reparación de aire acondicionado y calefacción',    true),
  ('Vidriería',     'Instalación y reparación de vidrios y espejos',                   true),
  ('Gas',           'Instalación y reparación de sistemas de gas',                     true),
  ('Fumigación',    'Control de plagas',                                                true),
  ('Otros',         'Otros trabajos de mantenimiento y reparación',                    true)
ON CONFLICT (nombre) DO UPDATE SET esta_activa = true;

-- Desactivar cualquier especialidad que no esté en la lista válida (registros de prueba, etc.)
UPDATE public.especialidades
SET esta_activa = false
WHERE nombre NOT IN (
  'Plomería', 'Electricidad', 'Albañilería', 'Carpintería', 'Pintura',
  'Herrería', 'Cerrajería', 'Climatización', 'Vidriería', 'Gas', 'Fumigación', 'Otros'
);
