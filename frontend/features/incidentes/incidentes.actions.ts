'use server'

/**
 * Server Actions para Incidentes
 * Mutaciones desde Client Components
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import * as IncidenteRepository from './incidentes.repository'
import { requireClienteId, requireAdmin } from '@/features/auth'
import type { CreateIncidenteDTO, UpdateIncidenteDTO } from './incidentes.types'
import type { ActionResult } from '@/shared/types'

/**
 * Crear un nuevo incidente (cliente)
 */
export async function createIncidente(
  data: Omit<CreateIncidenteDTO, 'id_cliente_reporta'>
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const idCliente = await requireClienteId()

    const result = await IncidenteRepository.create(supabase, {
      ...data,
      id_cliente_reporta: idCliente,
    })

    revalidatePath('/cliente/incidentes')

    return { success: true, data: result }
  } catch (error) {
    console.error('Error al crear incidente:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Actualizar estado de un incidente (admin)
 */
export async function updateIncidenteEstado(
  idIncidente: number,
  estado: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireAdmin()

    await IncidenteRepository.updateEstado(supabase, idIncidente, estado)

    revalidatePath('/dashboard/incidentes')
    revalidatePath(`/cliente/incidentes`)
    revalidatePath(`/tecnico/trabajos`)

    return { success: true }
  } catch (error) {
    console.error('Error al actualizar estado:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Actualizar incidente (admin)
 */
export async function updateIncidente(
  idIncidente: number,
  updates: UpdateIncidenteDTO
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireAdmin()

    await IncidenteRepository.update(supabase, idIncidente, updates)

    revalidatePath('/dashboard/incidentes')
    revalidatePath(`/cliente/incidentes`)

    return { success: true }
  } catch (error) {
    console.error('Error al actualizar incidente:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}
