'use server'

/**
 * Servicio de Asignaciones
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireTecnicoId } from '@/features/auth/auth.service'
import type { Asignacion, AsignacionTecnico } from './asignaciones.types'
import type { ActionResult } from '@/shared/types'

// Select con incidente y detalles
const ASIGNACION_SELECT = `
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
 * Obtener todas las asignaciones (admin)
 */
export async function getAsignacionesForAdmin(): Promise<Asignacion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(ASIGNACION_SELECT)
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as unknown as Asignacion[]
}

/**
 * Obtener asignaciones pendientes del técnico actual
 */
export async function getAsignacionesPendientes(): Promise<Asignacion[]> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()

  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(ASIGNACION_SELECT)
    .eq('id_tecnico', idTecnico)
    .eq('estado_asignacion', 'pendiente')
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data as unknown as Asignacion[]
}

/**
 * Obtener cantidad de asignaciones pendientes del técnico actual
 */
export async function getCountAsignacionesPendientes(): Promise<number> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()

  const { count, error } = await supabase
    .from('asignaciones_tecnico')
    .select('id_asignacion', { count: 'exact', head: true })
    .eq('id_tecnico', idTecnico)
    .eq('estado_asignacion', 'pendiente')

  if (error) return 0
  return count || 0
}

/**
 * Obtener asignaciones activas del técnico actual (aceptadas, en_curso, completadas)
 */
export async function getAsignacionesActivas(): Promise<AsignacionTecnico[]> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()

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

// --- Escrituras ---

export async function aceptarAsignacion(
  idAsignacion: number,
  idIncidente: number
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error: errorAsignacion } = await supabase
      .from('asignaciones_tecnico')
      .update({
        estado_asignacion: 'aceptada',
        fecha_aceptacion: new Date().toISOString(),
      })
      .eq('id_asignacion', idAsignacion)

    if (errorAsignacion) return { success: false, error: errorAsignacion.message }

    // El incidente ya debería estar en 'en_proceso' cuando se crea la asignación
    // No es necesario cambiar el estado aquí, pero si se requiere, usar 'en_proceso'
    const { error: errorIncidente } = await supabase
      .from('incidentes')
      .update({ estado_actual: 'en_proceso' })
      .eq('id_incidente', idIncidente)

    if (errorIncidente) return { success: false, error: errorIncidente.message }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al aceptar asignación' }
  }
}

export async function rechazarAsignacion(
  idAsignacion: number,
  idIncidente: number
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error: errorAsignacion } = await supabase
      .from('asignaciones_tecnico')
      .update({
        estado_asignacion: 'rechazada',
        fecha_rechazo: new Date().toISOString(),
      })
      .eq('id_asignacion', idAsignacion)

    if (errorAsignacion) return { success: false, error: errorAsignacion.message }

    // Al rechazar, volver a 'pendiente' para que pueda ser reasignado
    const { error: errorIncidente } = await supabase
      .from('incidentes')
      .update({ estado_actual: 'pendiente' })
      .eq('id_incidente', idIncidente)

    if (errorIncidente) return { success: false, error: errorIncidente.message }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al rechazar asignación' }
  }
}

export async function crearAsignacion(data: {
  id_incidente: number
  id_tecnico: number
  observaciones: string | null
}): Promise<ActionResult> {
  try {
    const { createAdminClient } = await import('@/shared/lib/supabase/admin')
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('asignaciones_tecnico')
      .insert({
        ...data,
        estado_asignacion: 'pendiente',
      })

    if (error) return { success: false, error: error.message }

    // Actualizar estado del incidente a "en_proceso" si está en "pendiente"
    await supabase
      .from('incidentes')
      .update({ estado_actual: 'en_proceso' })
      .eq('id_incidente', data.id_incidente)
      .eq('estado_actual', 'pendiente')

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear asignación' }
  }
}
