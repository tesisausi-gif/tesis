/**
 * Repository de Asignaciones
 * Queries puras a Supabase para asignaciones de técnicos
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  Asignacion,
  AsignacionTecnico,
  CreateAsignacionDTO,
} from './asignaciones.types'

// Select con incidente y técnico
const ASIGNACION_CON_DETALLES_SELECT = `
  id_asignacion,
  id_incidente,
  id_tecnico,
  estado_asignacion,
  fecha_asignacion,
  fecha_aceptacion,
  fecha_rechazo,
  fecha_visita_programada,
  observaciones,
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
 * Obtener todas las asignaciones (para admin)
 */
export async function findAll(
  supabase: SupabaseClient
): Promise<Asignacion[]> {
  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(ASIGNACION_CON_DETALLES_SELECT)
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as unknown as Asignacion[]
}

/**
 * Obtener asignaciones pendientes de un técnico
 */
export async function findPendientesByTecnico(
  supabase: SupabaseClient,
  idTecnico: number
): Promise<Asignacion[]> {
  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(ASIGNACION_CON_DETALLES_SELECT)
    .eq('id_tecnico', idTecnico)
    .eq('estado_asignacion', 'pendiente')
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as unknown as Asignacion[]
}

/**
 * Obtener asignaciones activas de un técnico (aceptadas o en curso)
 */
export async function findActivasByTecnico(
  supabase: SupabaseClient,
  idTecnico: number
): Promise<AsignacionTecnico[]> {
  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(`
      id_asignacion,
      id_incidente,
      id_tecnico,
      estado_asignacion,
      fecha_asignacion,
      fecha_visita_programada,
      observaciones,
      incidentes (
        id_incidente,
        descripcion_problema,
        categoria,
        nivel_prioridad,
        estado_actual,
        inmuebles (
          calle,
          altura,
          piso,
          dpto,
          barrio,
          localidad
        )
      )
    `)
    .eq('id_tecnico', idTecnico)
    .in('estado_asignacion', ['aceptada', 'en_curso', 'completada'])
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as unknown as AsignacionTecnico[]
}

/**
 * Crear una nueva asignación
 */
export async function create(
  supabase: SupabaseClient,
  dto: CreateAsignacionDTO
): Promise<{ id_asignacion: number }> {
  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .insert({
      id_incidente: dto.id_incidente,
      id_tecnico: dto.id_tecnico,
      observaciones: dto.observaciones || null,
      estado_asignacion: 'pendiente',
      fecha_asignacion: new Date().toISOString(),
    })
    .select('id_asignacion')
    .single()

  if (error) throw error
  return data
}

/**
 * Aceptar una asignación
 */
export async function aceptar(
  supabase: SupabaseClient,
  idAsignacion: number
): Promise<void> {
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
 * Rechazar una asignación
 */
export async function rechazar(
  supabase: SupabaseClient,
  idAsignacion: number
): Promise<void> {
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
export async function updateEstado(
  supabase: SupabaseClient,
  idAsignacion: number,
  estado: string
): Promise<void> {
  const updates: Record<string, unknown> = { estado_asignacion: estado }

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

/**
 * Obtener id_incidente de una asignación
 */
export async function findIncidenteIdByAsignacion(
  supabase: SupabaseClient,
  idAsignacion: number
): Promise<number> {
  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select('id_incidente')
    .eq('id_asignacion', idAsignacion)
    .single()

  if (error) throw error
  return data.id_incidente
}
