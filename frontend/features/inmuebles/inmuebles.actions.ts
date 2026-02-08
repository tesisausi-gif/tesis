'use server'

/**
 * Server Actions para Inmuebles
 * Mutaciones desde Client Components
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import * as InmuebleRepository from './inmuebles.repository'
import { requireClienteId } from '@/features/auth'
import type { CreateInmuebleDTO, UpdateInmuebleDTO } from './inmuebles.types'
import type { ActionResult } from '@/shared/types'

/**
 * Crear un nuevo inmueble (cliente)
 */
export async function createInmueble(
  data: Omit<CreateInmuebleDTO, 'id_cliente'>
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const idCliente = await requireClienteId()

    const result = await InmuebleRepository.create(supabase, {
      ...data,
      id_cliente: idCliente,
    })

    revalidatePath('/cliente/propiedades')

    return { success: true, data: result }
  } catch (error) {
    console.error('Error al crear inmueble:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Actualizar un inmueble (cliente)
 */
export async function updateInmueble(
  idInmueble: number,
  updates: UpdateInmuebleDTO
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireClienteId()

    await InmuebleRepository.update(supabase, idInmueble, updates)

    revalidatePath('/cliente/propiedades')
    revalidatePath(`/inmueble/${idInmueble}`)

    return { success: true }
  } catch (error) {
    console.error('Error al actualizar inmueble:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Cambiar estado activo de inmueble (cliente)
 */
export async function toggleInmuebleActivo(
  idInmueble: number,
  activo: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireClienteId()

    await InmuebleRepository.updateActivo(supabase, idInmueble, activo)

    revalidatePath('/cliente/propiedades')

    return { success: true }
  } catch (error) {
    console.error('Error al cambiar estado:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}
