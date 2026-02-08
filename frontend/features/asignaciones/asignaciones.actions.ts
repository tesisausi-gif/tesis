'use server'

/**
 * Server Actions para Asignaciones
 * Mutaciones que requieren lógica de negocio (multi-tabla)
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { requireTecnicoId, requireAdmin } from '@/features/auth'
import { EstadoIncidente } from '@/shared/types'
import type { CreateAsignacionDTO } from './asignaciones.types'
import type { ActionResult } from '@/shared/types'

/**
 * Crear una nueva asignación (admin)
 */
export async function createAsignacion(
  data: CreateAsignacionDTO
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireAdmin()

    const { data: result, error } = await supabase
      .from('asignaciones_tecnico')
      .insert({
        id_incidente: data.id_incidente,
        id_tecnico: data.id_tecnico,
        observaciones: data.observaciones || null,
        estado_asignacion: 'pendiente',
        fecha_asignacion: new Date().toISOString(),
      })
      .select('id_asignacion')
      .single()

    if (error) throw error

    revalidatePath('/dashboard/asignaciones')
    revalidatePath('/dashboard/incidentes')
    revalidatePath('/tecnico/disponibles')

    return { success: true, data: result }
  } catch (error) {
    console.error('Error al crear asignación:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Aceptar una asignación (técnico)
 * Actualiza asignación + estado del incidente
 */
export async function aceptarAsignacion(
  idAsignacion: number
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireTecnicoId()

    // 1. Aceptar la asignación
    const { error: errorAsignacion } = await supabase
      .from('asignaciones_tecnico')
      .update({
        estado_asignacion: 'aceptada',
        fecha_aceptacion: new Date().toISOString(),
      })
      .eq('id_asignacion', idAsignacion)

    if (errorAsignacion) throw errorAsignacion

    // 2. Obtener id_incidente
    const { data: asignacion, error: errorGet } = await supabase
      .from('asignaciones_tecnico')
      .select('id_incidente')
      .eq('id_asignacion', idAsignacion)
      .single()

    if (errorGet) throw errorGet

    // 3. Actualizar estado del incidente
    const { error: errorIncidente } = await supabase
      .from('incidentes')
      .update({ estado_actual: EstadoIncidente.ASIGNADO })
      .eq('id_incidente', asignacion.id_incidente)

    if (errorIncidente) throw errorIncidente

    revalidatePath('/tecnico/disponibles')
    revalidatePath('/tecnico/trabajos')
    revalidatePath('/dashboard/incidentes')
    revalidatePath('/dashboard/asignaciones')

    return { success: true }
  } catch (error) {
    console.error('Error al aceptar asignación:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Rechazar una asignación (técnico)
 * Actualiza asignación + vuelve incidente a reportado
 */
export async function rechazarAsignacion(
  idAsignacion: number
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireTecnicoId()

    // 1. Rechazar la asignación
    const { error: errorAsignacion } = await supabase
      .from('asignaciones_tecnico')
      .update({
        estado_asignacion: 'rechazada',
        fecha_rechazo: new Date().toISOString(),
      })
      .eq('id_asignacion', idAsignacion)

    if (errorAsignacion) throw errorAsignacion

    // 2. Obtener id_incidente
    const { data: asignacion, error: errorGet } = await supabase
      .from('asignaciones_tecnico')
      .select('id_incidente')
      .eq('id_asignacion', idAsignacion)
      .single()

    if (errorGet) throw errorGet

    // 3. Volver incidente a reportado
    const { error: errorIncidente } = await supabase
      .from('incidentes')
      .update({ estado_actual: EstadoIncidente.REPORTADO })
      .eq('id_incidente', asignacion.id_incidente)

    if (errorIncidente) throw errorIncidente

    revalidatePath('/tecnico/disponibles')
    revalidatePath('/dashboard/incidentes')
    revalidatePath('/dashboard/asignaciones')

    return { success: true }
  } catch (error) {
    console.error('Error al rechazar asignación:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}
