/**
 * Servicio de Asignaciones
 * Centraliza todas las queries relacionadas con asignaciones de técnicos
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Tipos
export interface Asignacion {
  id_asignacion: number
  id_incidente: number
  id_tecnico: number
  estado_asignacion: string
  fecha_asignacion: string
  fecha_aceptacion?: string | null
  fecha_rechazo?: string | null
  observaciones?: string | null
  incidentes?: {
    id_incidente: number
    descripcion_problema: string
    categoria: string | null
    nivel_prioridad: string | null
    estado_actual: string
    disponibilidad: string | null
    inmuebles?: {
      calle: string | null
      altura: string | null
      piso: string | null
      dpto: string | null
      barrio: string | null
      localidad: string | null
    } | null
    clientes?: {
      nombre: string
      apellido: string
      telefono: string | null
    } | null
  } | null
  tecnicos?: {
    nombre: string
    apellido: string
  } | null
}

// Select base
const ASIGNACION_SELECT = `
  id_asignacion,
  id_incidente,
  id_tecnico,
  estado_asignacion,
  fecha_asignacion,
  fecha_aceptacion,
  fecha_rechazo,
  observaciones
`

const ASIGNACION_CON_INCIDENTE_SELECT = `
  ${ASIGNACION_SELECT},
  incidentes (
    id_incidente,
    descripcion_problema,
    categoria,
    nivel_prioridad,
    estado_actual,
    disponibilidad,
    inmuebles (
      calle,
      altura,
      piso,
      dpto,
      barrio,
      localidad
    ),
    clientes:id_cliente_reporta (
      nombre,
      apellido,
      telefono
    )
  ),
  tecnicos (
    nombre,
    apellido
  )
`

/**
 * Obtener todas las asignaciones (admin)
 */
export async function getAsignaciones(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(ASIGNACION_CON_INCIDENTE_SELECT)
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as Asignacion[]
}

/**
 * Obtener asignaciones pendientes de un técnico
 */
export async function getAsignacionesPendientes(
  supabase: SupabaseClient,
  idTecnico: number
) {
  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(ASIGNACION_CON_INCIDENTE_SELECT)
    .eq('id_tecnico', idTecnico)
    .eq('estado_asignacion', 'pendiente')
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as Asignacion[]
}

/**
 * Obtener asignaciones activas de un técnico (aceptadas o en curso)
 */
export async function getAsignacionesActivas(
  supabase: SupabaseClient,
  idTecnico: number
) {
  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(ASIGNACION_CON_INCIDENTE_SELECT)
    .eq('id_tecnico', idTecnico)
    .in('estado_asignacion', ['aceptada', 'en_curso'])
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as Asignacion[]
}

/**
 * Crear una nueva asignación (admin)
 */
export async function createAsignacion(
  supabase: SupabaseClient,
  data: {
    id_incidente: number
    id_tecnico: number
    observaciones?: string
  }
) {
  const { data: asignacion, error } = await supabase
    .from('asignaciones_tecnico')
    .insert({
      ...data,
      estado_asignacion: 'pendiente',
      fecha_asignacion: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return asignacion
}

/**
 * Aceptar una asignación (técnico)
 */
export async function aceptarAsignacion(
  supabase: SupabaseClient,
  idAsignacion: number
) {
  const { error } = await supabase
    .from('asignaciones_tecnico')
    .update({
      estado_asignacion: 'aceptada',
      fecha_aceptacion: new Date().toISOString(),
    })
    .eq('id_asignacion', idAsignacion)

  if (error) throw error
}

/**
 * Rechazar una asignación (técnico)
 */
export async function rechazarAsignacion(
  supabase: SupabaseClient,
  idAsignacion: number
) {
  const { error } = await supabase
    .from('asignaciones_tecnico')
    .update({
      estado_asignacion: 'rechazada',
      fecha_rechazo: new Date().toISOString(),
    })
    .eq('id_asignacion', idAsignacion)

  if (error) throw error
}

/**
 * Actualizar estado de asignación
 */
export async function updateAsignacionEstado(
  supabase: SupabaseClient,
  idAsignacion: number,
  estado: string
) {
  const updates: Record<string, any> = { estado_asignacion: estado }

  if (estado === 'aceptada') {
    updates.fecha_aceptacion = new Date().toISOString()
  } else if (estado === 'rechazada') {
    updates.fecha_rechazo = new Date().toISOString()
  }

  const { error } = await supabase
    .from('asignaciones_tecnico')
    .update(updates)
    .eq('id_asignacion', idAsignacion)

  if (error) throw error
}
