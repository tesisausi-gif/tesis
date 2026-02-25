'use server'

/**
 * Servicio de Conformidades
 * El admin crea la conformidad; el cliente la firma.
 */

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import type { ActionResult } from '@/shared/types'
import type { Conformidad, CreateConformidadDTO } from './conformidades.types'

/**
 * Obtener la conformidad de un incidente (si existe)
 */
export async function getConformidadDelIncidente(idIncidente: number): Promise<Conformidad | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conformidades')
    .select('*')
    .eq('id_incidente', idIncidente)
    .maybeSingle()

  if (error) throw error
  return data as Conformidad | null
}

/**
 * Crear una conformidad (admin)
 */
export async function crearConformidad(dto: CreateConformidadDTO): Promise<ActionResult> {
  try {
    const supabase = await createAdminClient()

    // Verificar que no exista ya una conformidad para este incidente
    const { data: existing } = await supabase
      .from('conformidades')
      .select('id_conformidad')
      .eq('id_incidente', dto.id_incidente)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Ya existe una conformidad para este incidente' }
    }

    const { error } = await supabase
      .from('conformidades')
      .insert({
        id_incidente: dto.id_incidente,
        id_cliente: dto.id_cliente,
        descripcion_trabajo: dto.descripcion_trabajo ?? null,
        esta_firmada: false,
      })

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al crear conformidad' }
  }
}

/**
 * Firmar una conformidad (cliente)
 */
export async function firmarConformidad(idConformidad: number, observaciones?: string | null): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('conformidades')
      .update({
        esta_firmada: true,
        fecha_firma: new Date().toISOString(),
        observaciones: observaciones ?? null,
      })
      .eq('id_conformidad', idConformidad)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al firmar conformidad' }
  }
}
