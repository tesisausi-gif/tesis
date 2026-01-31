-- ============================================
-- RLS PARA TABLAS CRÍTICAS
-- Fecha: 2026-01-31
-- ============================================
-- Este archivo implementa Row Level Security (RLS) para las tablas
-- que actualmente no tienen protección a nivel de base de datos.
-- Siguiendo las mejores prácticas de Supabase para performance.

-- ============================================
-- 1. TABLA: incidentes
-- ============================================

ALTER TABLE public.incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidentes FORCE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Admins pueden ver todos los incidentes" ON public.incidentes;
DROP POLICY IF EXISTS "Clientes pueden ver sus incidentes" ON public.incidentes;
DROP POLICY IF EXISTS "Tecnicos pueden ver incidentes asignados" ON public.incidentes;
DROP POLICY IF EXISTS "Clientes pueden crear incidentes" ON public.incidentes;
DROP POLICY IF EXISTS "Admins pueden actualizar incidentes" ON public.incidentes;
DROP POLICY IF EXISTS "Tecnicos pueden actualizar incidentes asignados" ON public.incidentes;

-- SELECT: Admins ven todos los incidentes
CREATE POLICY "Admins pueden ver todos los incidentes" ON public.incidentes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- SELECT: Clientes ven solo sus incidentes
CREATE POLICY "Clientes pueden ver sus incidentes" ON public.incidentes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'cliente'
        AND usuarios.id_cliente = incidentes.id_cliente_reporta
    )
  );

-- SELECT: Técnicos ven incidentes que tienen asignados
CREATE POLICY "Tecnicos pueden ver incidentes asignados" ON public.incidentes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_tecnico a
      JOIN public.usuarios u ON u.id_tecnico = a.id_tecnico
      WHERE u.id = (SELECT auth.uid())
        AND u.rol = 'tecnico'
        AND a.id_incidente = incidentes.id_incidente
    )
  );

-- INSERT: Clientes pueden crear incidentes
CREATE POLICY "Clientes pueden crear incidentes" ON public.incidentes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'cliente'
        AND usuarios.id_cliente = id_cliente_reporta
    )
  );

-- UPDATE: Admins pueden actualizar cualquier incidente
CREATE POLICY "Admins pueden actualizar incidentes" ON public.incidentes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- UPDATE: Técnicos pueden actualizar incidentes asignados
CREATE POLICY "Tecnicos pueden actualizar incidentes asignados" ON public.incidentes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_tecnico a
      JOIN public.usuarios u ON u.id_tecnico = a.id_tecnico
      WHERE u.id = (SELECT auth.uid())
        AND u.rol = 'tecnico'
        AND a.id_incidente = incidentes.id_incidente
        AND a.estado_asignacion IN ('aceptada', 'en_curso')
    )
  );

-- Índice para optimizar RLS
CREATE INDEX IF NOT EXISTS idx_incidentes_cliente_reporta ON public.incidentes(id_cliente_reporta);

-- ============================================
-- 2. TABLA: asignaciones_tecnico
-- ============================================

ALTER TABLE public.asignaciones_tecnico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_tecnico FORCE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Admins pueden ver todas las asignaciones" ON public.asignaciones_tecnico;
DROP POLICY IF EXISTS "Tecnicos pueden ver sus asignaciones" ON public.asignaciones_tecnico;
DROP POLICY IF EXISTS "Admins pueden crear asignaciones" ON public.asignaciones_tecnico;
DROP POLICY IF EXISTS "Admins pueden actualizar asignaciones" ON public.asignaciones_tecnico;
DROP POLICY IF EXISTS "Tecnicos pueden actualizar sus asignaciones" ON public.asignaciones_tecnico;

-- SELECT: Admins ven todas las asignaciones
CREATE POLICY "Admins pueden ver todas las asignaciones" ON public.asignaciones_tecnico
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- SELECT: Técnicos ven sus propias asignaciones
CREATE POLICY "Tecnicos pueden ver sus asignaciones" ON public.asignaciones_tecnico
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'tecnico'
        AND usuarios.id_tecnico = asignaciones_tecnico.id_tecnico
    )
  );

-- INSERT: Solo admins pueden crear asignaciones
CREATE POLICY "Admins pueden crear asignaciones" ON public.asignaciones_tecnico
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- UPDATE: Admins pueden actualizar cualquier asignación
CREATE POLICY "Admins pueden actualizar asignaciones" ON public.asignaciones_tecnico
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- UPDATE: Técnicos pueden actualizar sus propias asignaciones (aceptar/rechazar)
CREATE POLICY "Tecnicos pueden actualizar sus asignaciones" ON public.asignaciones_tecnico
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'tecnico'
        AND usuarios.id_tecnico = asignaciones_tecnico.id_tecnico
    )
  );

-- Índices para optimizar RLS
CREATE INDEX IF NOT EXISTS idx_asignaciones_tecnico ON public.asignaciones_tecnico(id_tecnico);
CREATE INDEX IF NOT EXISTS idx_asignaciones_incidente ON public.asignaciones_tecnico(id_incidente);

-- ============================================
-- 3. TABLA: inmuebles
-- ============================================

ALTER TABLE public.inmuebles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inmuebles FORCE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Admins pueden ver todos los inmuebles" ON public.inmuebles;
DROP POLICY IF EXISTS "Clientes pueden ver sus inmuebles" ON public.inmuebles;
DROP POLICY IF EXISTS "Tecnicos pueden ver inmuebles de incidentes asignados" ON public.inmuebles;
DROP POLICY IF EXISTS "Clientes pueden crear inmuebles" ON public.inmuebles;
DROP POLICY IF EXISTS "Admins pueden actualizar inmuebles" ON public.inmuebles;
DROP POLICY IF EXISTS "Clientes pueden actualizar sus inmuebles" ON public.inmuebles;

-- SELECT: Admins ven todos los inmuebles
CREATE POLICY "Admins pueden ver todos los inmuebles" ON public.inmuebles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- SELECT: Clientes ven solo sus inmuebles
CREATE POLICY "Clientes pueden ver sus inmuebles" ON public.inmuebles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'cliente'
        AND usuarios.id_cliente = inmuebles.id_cliente
    )
  );

-- SELECT: Técnicos ven inmuebles de incidentes que tienen asignados
CREATE POLICY "Tecnicos pueden ver inmuebles de incidentes asignados" ON public.inmuebles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.incidentes i
      JOIN public.asignaciones_tecnico a ON a.id_incidente = i.id_incidente
      JOIN public.usuarios u ON u.id_tecnico = a.id_tecnico
      WHERE u.id = (SELECT auth.uid())
        AND u.rol = 'tecnico'
        AND i.id_propiedad = inmuebles.id_inmueble
    )
  );

-- INSERT: Clientes pueden crear inmuebles (para ellos mismos)
CREATE POLICY "Clientes pueden crear inmuebles" ON public.inmuebles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'cliente'
        AND usuarios.id_cliente = id_cliente
    )
  );

-- INSERT: Admins pueden crear inmuebles
CREATE POLICY "Admins pueden crear inmuebles" ON public.inmuebles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- UPDATE: Admins pueden actualizar cualquier inmueble
CREATE POLICY "Admins pueden actualizar inmuebles" ON public.inmuebles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- UPDATE: Clientes pueden actualizar sus propios inmuebles
CREATE POLICY "Clientes pueden actualizar sus inmuebles" ON public.inmuebles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'cliente'
        AND usuarios.id_cliente = inmuebles.id_cliente
    )
  );

-- Índice para optimizar RLS
CREATE INDEX IF NOT EXISTS idx_inmuebles_cliente ON public.inmuebles(id_cliente);

-- ============================================
-- 4. TABLA: presupuestos
-- ============================================

ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos FORCE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Admins pueden ver todos los presupuestos" ON public.presupuestos;
DROP POLICY IF EXISTS "Clientes pueden ver presupuestos de sus incidentes" ON public.presupuestos;
DROP POLICY IF EXISTS "Tecnicos pueden ver sus presupuestos" ON public.presupuestos;
DROP POLICY IF EXISTS "Tecnicos pueden crear presupuestos" ON public.presupuestos;
DROP POLICY IF EXISTS "Admins pueden actualizar presupuestos" ON public.presupuestos;
DROP POLICY IF EXISTS "Tecnicos pueden actualizar sus presupuestos" ON public.presupuestos;

-- SELECT: Admins ven todos los presupuestos
CREATE POLICY "Admins pueden ver todos los presupuestos" ON public.presupuestos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- SELECT: Clientes ven presupuestos de sus incidentes
CREATE POLICY "Clientes pueden ver presupuestos de sus incidentes" ON public.presupuestos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.incidentes i
      JOIN public.usuarios u ON u.id_cliente = i.id_cliente_reporta
      WHERE u.id = (SELECT auth.uid())
        AND u.rol = 'cliente'
        AND i.id_incidente = presupuestos.id_incidente
    )
  );

-- SELECT: Técnicos ven sus propios presupuestos
CREATE POLICY "Tecnicos pueden ver sus presupuestos" ON public.presupuestos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'tecnico'
        AND usuarios.id_tecnico = presupuestos.id_tecnico
    )
  );

-- INSERT: Técnicos pueden crear presupuestos
CREATE POLICY "Tecnicos pueden crear presupuestos" ON public.presupuestos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'tecnico'
        AND usuarios.id_tecnico = id_tecnico
    )
  );

-- INSERT: Admins pueden crear presupuestos
CREATE POLICY "Admins pueden crear presupuestos" ON public.presupuestos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- UPDATE: Admins pueden actualizar cualquier presupuesto
CREATE POLICY "Admins pueden actualizar presupuestos" ON public.presupuestos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- UPDATE: Técnicos pueden actualizar sus presupuestos (solo en estado borrador)
CREATE POLICY "Tecnicos pueden actualizar sus presupuestos" ON public.presupuestos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'tecnico'
        AND usuarios.id_tecnico = presupuestos.id_tecnico
    )
    AND presupuestos.estado IN ('borrador', 'enviado')
  );

-- Índices para optimizar RLS
CREATE INDEX IF NOT EXISTS idx_presupuestos_tecnico ON public.presupuestos(id_tecnico);
CREATE INDEX IF NOT EXISTS idx_presupuestos_incidente ON public.presupuestos(id_incidente);

-- ============================================
-- 5. TABLA: pagos
-- ============================================

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos FORCE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Admins pueden ver todos los pagos" ON public.pagos;
DROP POLICY IF EXISTS "Clientes pueden ver pagos de sus incidentes" ON public.pagos;
DROP POLICY IF EXISTS "Tecnicos pueden ver pagos de sus trabajos" ON public.pagos;
DROP POLICY IF EXISTS "Admins pueden crear pagos" ON public.pagos;
DROP POLICY IF EXISTS "Admins pueden actualizar pagos" ON public.pagos;

-- SELECT: Admins ven todos los pagos
CREATE POLICY "Admins pueden ver todos los pagos" ON public.pagos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- SELECT: Clientes ven pagos relacionados a sus incidentes
CREATE POLICY "Clientes pueden ver pagos de sus incidentes" ON public.pagos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.presupuestos p
      JOIN public.incidentes i ON i.id_incidente = p.id_incidente
      JOIN public.usuarios u ON u.id_cliente = i.id_cliente_reporta
      WHERE u.id = (SELECT auth.uid())
        AND u.rol = 'cliente'
        AND p.id_presupuesto = pagos.id_presupuesto
    )
  );

-- SELECT: Técnicos ven pagos de sus presupuestos
CREATE POLICY "Tecnicos pueden ver pagos de sus trabajos" ON public.pagos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.presupuestos p
      JOIN public.usuarios u ON u.id_tecnico = p.id_tecnico
      WHERE u.id = (SELECT auth.uid())
        AND u.rol = 'tecnico'
        AND p.id_presupuesto = pagos.id_presupuesto
    )
  );

-- INSERT: Solo admins pueden registrar pagos
CREATE POLICY "Admins pueden crear pagos" ON public.pagos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- UPDATE: Solo admins pueden actualizar pagos
CREATE POLICY "Admins pueden actualizar pagos" ON public.pagos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = (SELECT auth.uid())
        AND usuarios.rol = 'admin'
    )
  );

-- Índice para optimizar RLS
CREATE INDEX IF NOT EXISTS idx_pagos_presupuesto ON public.pagos(id_presupuesto);

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON POLICY "Admins pueden ver todos los incidentes" ON public.incidentes
  IS 'Administradores tienen acceso completo a todos los incidentes';
COMMENT ON POLICY "Clientes pueden ver sus incidentes" ON public.incidentes
  IS 'Clientes solo pueden ver incidentes que ellos reportaron';
COMMENT ON POLICY "Tecnicos pueden ver incidentes asignados" ON public.incidentes
  IS 'Técnicos solo pueden ver incidentes que tienen asignados';
