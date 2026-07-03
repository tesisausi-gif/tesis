'use server'

/**
 * Servicio de Calificaciones
 * Lecturas y escrituras para Server Components y Server Actions
 * Columnas según esquema actual de producción:
 *   - puntuacion (no estrellas)
 *   - comentarios (no comentario)
 *   - resolvio_problema INTEGER 0/1
 *   - tipo_calificacion nullable (CHECK constraint en DB)
 *   - No existe id_cliente en la tabla
 */

import { translateDbError } from '@/shared/lib/db-errors'
import { createClient } from '@/shared/lib/supabase/server'
import type { Calificacion, CalificacionConDetalles } from './calificaciones.types'
import type { ActionResult } from '@/shared/types'

const CALIFICACION_SELECT = `
  id_calificacion,
  id_incidente,
  id_tecnico,
  tipo_calificacion,
  puntuacion,
  comentarios,
  resolvio_problema,
  fecha_calificacion,
  fecha_creacion,
  fecha_modificacion,
  incidentes (
    id_incidente,
    descripcion_problema,
    estado_actual
  ),
  tecnicos (
    nombre,
    apellido,
    correo_electronico
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
    .order('fecha_creacion', { ascending: false })

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
    .select('puntuacion')
    .eq('id_tecnico', idTecnico)

  if (error) throw error

  if (!data || data.length === 0) {
    return { promedio: 0, cantidad: 0 }
  }

  const suma = data.reduce((acc, cal) => acc + (cal.puntuacion || 0), 0)
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
    .order('fecha_creacion', { ascending: false })

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

// --- Escrituras ---
// Nota: el CLIENTE no califica al técnico. La calificación del técnico la registra
// la administración al aprobar la conformidad (features/conformidades). Por eso se
// eliminaron crearCalificacion/existeCalificacionDelCliente (calificación del cliente).

/**
 * Actualizar calificación
 */
export async function actualizarCalificacion(
  idCalificacion: number,
  updates: {
    puntuacion?: number
    comentarios?: string | null
    resolvio_problema?: number
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    if (updates.puntuacion && (updates.puntuacion < 1 || updates.puntuacion > 5)) {
      return { success: false, error: 'La puntuación debe estar entre 1 y 5' }
    }

    const { error } = await supabase
      .from('calificaciones')
      .update(updates)
      .eq('id_calificacion', idCalificacion)

    if (error) return { success: false, error: translateDbError(error) }
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

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al eliminar calificación' }
  }
}
