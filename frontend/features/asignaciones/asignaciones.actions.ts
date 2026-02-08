'use server'

/**
 * Server Actions para Asignaciones
 * Mutaciones desde Client Components
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import * as AsignacionRepository from './asignaciones.repository'
import * as IncidenteRepository from '@/features/incidentes/incidentes.repository'
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

    const result = await AsignacionRepository.create(supabase, data)

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
 */
export async function aceptarAsignacion(
  idAsignacion: number
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireTecnicoId()

    // Aceptar la asignación
    await AsignacionRepository.aceptar(supabase, idAsignacion)

    // Obtener el id_incidente y actualizar su estado
    const idIncidente = await AsignacionRepository.findIncidenteIdByAsignacion(
      supabase,
      idAsignacion
    )
    await IncidenteRepository.updateEstado(
      supabase,
      idIncidente,
      EstadoIncidente.ASIGNADO
    )

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
 */
export async function rechazarAsignacion(
  idAsignacion: number
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireTecnicoId()

    // Rechazar la asignación
    await AsignacionRepository.rechazar(supabase, idAsignacion)

    // Obtener el id_incidente y volver a estado reportado
    const idIncidente = await AsignacionRepository.findIncidenteIdByAsignacion(
      supabase,
      idAsignacion
    )
    await IncidenteRepository.updateEstado(
      supabase,
      idIncidente,
      EstadoIncidente.REPORTADO
    )

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

/**
 * Actualizar estado de asignación (admin/técnico)
 */
export async function updateAsignacionEstado(
  idAsignacion: number,
  estado: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    await AsignacionRepository.updateEstado(supabase, idAsignacion, estado)

    revalidatePath('/tecnico/trabajos')
    revalidatePath('/tecnico/disponibles')
    revalidatePath('/dashboard/asignaciones')

    return { success: true }
  } catch (error) {
    console.error('Error al actualizar estado:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}
