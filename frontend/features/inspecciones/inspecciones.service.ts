'use server'

/**
 * Servicio de Inspecciones
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireTecnicoId } from '@/features/auth/auth.service'
import type { ActionResult } from '@/shared/types'
import type { Inspeccion, InspeccionConDetalle } from './inspecciones.types'

const INSPECCION_SELECT = `
  id_inspeccion,
  id_incidente,
  id_tecnico,
  fecha_inspeccion,
  descripcion_inspeccion,
  hallazgos,
  fotos_url,
  estado_inmueble,
  observaciones,
  fecha_registro,
  incidentes (
    id_incidente,
    descripcion_problema,
    categoria
  ),
  tecnicos (
    nombre,
    apellido
  )
`

/**
 * Obtener inspecciones de un incidente
 */
export async function getInspeccionesDelIncidente(idIncidente: number): Promise<InspeccionConDetalle[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspecciones')
    .select(INSPECCION_SELECT)
    .eq('id_incidente', idIncidente)
    .order('fecha_inspeccion', { ascending: true })

  if (error) throw error
  return data as unknown as InspeccionConDetalle[]
}

/**
 * Obtener inspecciones realizadas por el técnico actual
 */
export async function getInspeccionesDeTecnico(): Promise<InspeccionConDetalle[]> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()

  const { data, error } = await supabase
    .from('inspecciones')
    .select(INSPECCION_SELECT)
    .eq('id_tecnico', idTecnico)
    .order('fecha_inspeccion', { ascending: false })

  if (error) throw error
  return data as unknown as InspeccionConDetalle[]
}

/**
 * Obtener una inspección específica
 */
export async function getInspeccion(idInspeccion: number): Promise<InspeccionConDetalle | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspecciones')
    .select(INSPECCION_SELECT)
    .eq('id_inspeccion', idInspeccion)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return (data as unknown as InspeccionConDetalle) || null
}

// --- Escrituras ---

/**
 * Crear una nueva inspección
 */
export async function crearInspeccion(data: {
  id_incidente: number
  id_tecnico: number
  descripcion_inspeccion: string
  hallazgos?: string
  fotos_url?: string[]
  estado_inmueble?: string
  observaciones?: string
}): Promise<ActionResult<Inspeccion>> {
  try {
    const supabase = await createClient()

    const { data: inspeccion, error } = await supabase
      .from('inspecciones')
      .insert({
        ...data,
        fecha_inspeccion: new Date().toISOString(),
        fecha_registro: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: inspeccion as Inspeccion }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear inspección' }
  }
}

/**
 * Actualizar inspección
 */
export async function actualizarInspeccion(
  idInspeccion: number,
  updates: {
    descripcion_inspeccion?: string
    hallazgos?: string
    fotos_url?: string[]
    estado_inmueble?: string
    observaciones?: string
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('inspecciones')
      .update(updates)
      .eq('id_inspeccion', idInspeccion)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar inspección' }
  }
}

/**
 * Agregar fotos a una inspección
 */
export async function agregarFotosAInspeccion(
  idInspeccion: number,
  fotosUrls: string[]
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Obtener fotos existentes
    const inspeccion = await getInspeccion(idInspeccion)
    if (!inspeccion) {
      return { success: false, error: 'Inspección no encontrada' }
    }

    // Combinar con fotos existentes
    const fotosActuales = inspeccion.fotos_url || []
    const todasLasFotos = [...fotosActuales, ...fotosUrls]

    const { error } = await supabase
      .from('inspecciones')
      .update({
        fotos_url: todasLasFotos,
      })
      .eq('id_inspeccion', idInspeccion)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al agregar fotos' }
  }
}

/**
 * Eliminar inspección
 */
export async function eliminarInspeccion(idInspeccion: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('inspecciones')
      .delete()
      .eq('id_inspeccion', idInspeccion)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al eliminar inspección' }
  }
}
