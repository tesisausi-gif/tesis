'use server'

/**
 * Servicio de Calificaciones
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireClienteId } from '@/features/auth/auth.service'
import type { Calificacion, CalificacionConDetalles } from './calificaciones.types'
import type { ActionResult } from '@/shared/types'

const CALIFICACION_SELECT = `
  id_calificacion,
  id_incidente,
  id_tecnico,
  id_cliente,
  estrellas,
  comentario,
  aspecto_tecnico,
  puntualidad,
  actitud,
  fecha_calificacion,
  fecha_registro,
  incidentes (
    id_incidente,
    descripcion_problema,
    estado_actual
  ),
  tecnicos (
    nombre,
    apellido,
    email
  ),
  clientes:id_cliente (
    nombre,
    apellido
  )
`

/**
 * Obtener calificaciones de un técnico
 */
export async function getCalificacionesDeTecnico(idTecnico: number): Promise<CalificacionConDetalles[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calificaciones')
    .select(CALIFICACION_SELECT)
    .eq('id_tecnico', idTecnico)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return data as unknown as CalificacionConDetalles[]
}

/**
 * Obtener calificación promedio de un técnico
 */
export async function getPromedioCalificacionesTecnico(idTecnico: number): Promise<{
  promedio: number
  cantidad: number
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calificaciones')
    .select('estrellas')
    .eq('id_tecnico', idTecnico)

  if (error) throw error

  if (!data || data.length === 0) {
    return { promedio: 0, cantidad: 0 }
  }

  const suma = data.reduce((acc, cal) => acc + (cal.estrellas || 0), 0)
  return {
    promedio: suma / data.length,
    cantidad: data.length,
  }
}

/**
 * Obtener calificaciones de un incidente
 */
export async function getCalificacionesDelIncidente(
  idIncidente: number
): Promise<CalificacionConDetalles[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calificaciones')
    .select(CALIFICACION_SELECT)
    .eq('id_incidente', idIncidente)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return data as unknown as CalificacionConDetalles[]
}

/**
 * Obtener calificación específica
 */
export async function getCalificacion(idCalificacion: number): Promise<CalificacionConDetalles | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calificaciones')
    .select(CALIFICACION_SELECT)
    .eq('id_calificacion', idCalificacion)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return (data as unknown as CalificacionConDetalles) || null
}

/**
 * Verificar si ya existe calificación del cliente para un incidente
 */
export async function existeCalificacionDelCliente(idIncidente: number): Promise<boolean> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()

  const { data, error } = await supabase
    .from('calificaciones')
    .select('id_calificacion', { count: 'exact' })
    .eq('id_incidente', idIncidente)
    .eq('id_cliente', idCliente)

  if (error) throw error
  return (data?.length ?? 0) > 0
}

// --- Escrituras ---

/**
 * Crear calificación de cliente para un técnico
 */
export async function crearCalificacion(data: {
  id_incidente: number
  id_tecnico: number
  estrellas: number
  comentario?: string | null
  aspecto_tecnico?: number | null
  puntualidad?: number | null
  actitud?: number | null
}): Promise<ActionResult<Calificacion>> {
  try {
    const supabase = await createClient()
    const idCliente = await requireClienteId()

    // Validar calificaciones
    if (data.estrellas < 1 || data.estrellas > 5) {
      return { success: false, error: 'Las estrellas deben estar entre 1 y 5' }
    }

    if (data.aspecto_tecnico && (data.aspecto_tecnico < 1 || data.aspecto_tecnico > 5)) {
      return { success: false, error: 'Aspecto técnico debe estar entre 1 y 5' }
    }

    if (data.puntualidad && (data.puntualidad < 1 || data.puntualidad > 5)) {
      return { success: false, error: 'Puntualidad debe estar entre 1 y 5' }
    }

    if (data.actitud && (data.actitud < 1 || data.actitud > 5)) {
      return { success: false, error: 'Actitud debe estar entre 1 y 5' }
    }

    // Verificar que no exista ya una calificación
    const existe = await existeCalificacionDelCliente(data.id_incidente)
    if (existe) {
      return { success: false, error: 'Ya has calificado este incidente' }
    }

    const { data: calificacion, error } = await supabase
      .from('calificaciones')
      .insert({
        ...data,
        id_cliente: idCliente,
        fecha_calificacion: new Date().toISOString(),
        fecha_registro: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: calificacion as Calificacion }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear calificación' }
  }
}

/**
 * Actualizar calificación
 */
export async function actualizarCalificacion(
  idCalificacion: number,
  updates: {
    estrellas?: number
    comentario?: string | null
    aspecto_tecnico?: number | null
    puntualidad?: number | null
    actitud?: number | null
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Validar valores si se proporcionan
    if (updates.estrellas && (updates.estrellas < 1 || updates.estrellas > 5)) {
      return { success: false, error: 'Las estrellas deben estar entre 1 y 5' }
    }

    const { error } = await supabase
      .from('calificaciones')
      .update(updates)
      .eq('id_calificacion', idCalificacion)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar calificación' }
  }
}

/**
 * Eliminar calificación
 */
export async function eliminarCalificacion(idCalificacion: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('calificaciones')
      .delete()
      .eq('id_calificacion', idCalificacion)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al eliminar calificación' }
  }
}
