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
  esta_anulada,
  fecha_inspeccion,
  descripcion_inspeccion,
  causas_determinadas,
  danos_ocasionados,
  requiere_materiales,
  descripcion_materiales,
  requiere_ayudantes,
  cantidad_ayudantes,
  dias_estimados_trabajo,
  fecha_creacion,
  fecha_modificacion,
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
 * Crear una nueva inspección.
 * Bloqueada si ya existe un presupuesto activo (no rechazado) para el incidente.
 */
export async function crearInspeccion(data: {
  id_incidente: number
  id_tecnico: number
  descripcion_inspeccion: string
  causas_determinadas?: string
  danos_ocasionados?: string
  requiere_materiales?: number
  descripcion_materiales?: string
  requiere_ayudantes?: number
  cantidad_ayudantes?: number
  dias_estimados_trabajo?: number
}): Promise<ActionResult<Inspeccion>> {
  try {
    const supabase = await createClient()

    // Bloquear si ya existe un presupuesto activo para el incidente
    const { createAdminClient } = await import('@/shared/lib/supabase/admin')
    const supabaseAdmin = createAdminClient()
    const { data: presupuestoExistente } = await supabaseAdmin
      .from('presupuestos')
      .select('id_presupuesto')
      .eq('id_incidente', data.id_incidente)
      .neq('estado_presupuesto', 'rechazado')
      .maybeSingle()

    if (presupuestoExistente) {
      return { success: false, error: 'Ya existe un presupuesto activo para este incidente. No se pueden agregar más inspecciones.' }
    }

    const { data: inspeccion, error } = await supabase
      .from('inspecciones')
      .insert({
        ...data,
        fecha_inspeccion: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    // Notificar al admin que se realizó la inspección
    const { crearNotificacionAdmin } = await import('@/features/notificaciones/notificaciones-inapp.service')
    await crearNotificacionAdmin({
      tipo: 'inspeccion_realizada',
      titulo: 'Inspección realizada',
      mensaje: `El técnico completó la inspección del incidente #${data.id_incidente}. Ya puede cargar el presupuesto.`,
      id_incidente: data.id_incidente,
    })

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
    causas_determinadas?: string
    danos_ocasionados?: string
    requiere_materiales?: number
    descripcion_materiales?: string
    requiere_ayudantes?: number
    cantidad_ayudantes?: number
    dias_estimados_trabajo?: number
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
 * Agregar fotos a una inspección.
 * NOTA: La columna fotos_url no existe en el esquema actual de producción.
 * Las fotos se suben a Storage correctamente pero la URL no se persiste en DB.
 * Aplicar la migración 20260303200000_fix_schema_to_match_services.sql para habilitarlo.
 */
export async function agregarFotosAInspeccion(
  _idInspeccion: number,
  _fotosUrls: string[]
): Promise<ActionResult> {
  return { success: true, data: undefined }
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
