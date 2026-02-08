'use server'

/**
 * Server Actions para Inmuebles
 * Mutaciones desde Client Components
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
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

    const { data: result, error } = await supabase
      .from('inmuebles')
      .insert({
        id_cliente: idCliente,
        id_tipo_inmueble: data.id_tipo_inmueble,
        provincia: data.provincia || null,
        localidad: data.localidad || null,
        barrio: data.barrio || null,
        calle: data.calle || null,
        altura: data.altura || null,
        piso: data.piso || null,
        dpto: data.dpto || null,
        informacion_adicional: data.informacion_adicional || null,
        esta_activo: true,
      })
      .select('id_inmueble')
      .single()

    if (error) throw error

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

    const { error } = await supabase
      .from('inmuebles')
      .update(updates)
      .eq('id_inmueble', idInmueble)

    if (error) throw error

    revalidatePath('/cliente/propiedades')

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

    const { error } = await supabase
      .from('inmuebles')
      .update({ esta_activo: activo })
      .eq('id_inmueble', idInmueble)

    if (error) throw error

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
