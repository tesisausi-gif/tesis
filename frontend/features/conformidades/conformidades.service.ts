'use server'

/**
 * Servicio de Conformidades
 * El admin crea la conformidad; el cliente la firma.
 * Columnas según esquema actual de producción:
 *   - tipo_conformidad (CHECK: 'final' | 'intermedia')
 *   - esta_firmada INTEGER (0/1)
 *   - fecha_conformidad (no fecha_firma)
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

    const { data: existing } = await supabase
      .from('conformidades')
      .select('id_conformidad')
      .eq('id_incidente', dto.id_incidente)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Ya existe una conformidad para este incidente' }
    }

    const { data: conformidad, error } = await supabase
      .from('conformidades')
      .insert({
        id_incidente: dto.id_incidente,
        id_cliente: dto.id_cliente,
        tipo_conformidad: dto.tipo_conformidad ?? 'intermedia',
        esta_firmada: 0,
      })
      .select('id_conformidad')
      .single()

    if (error) return { success: false, error: error.message }

    // Notificar al cliente que tiene una conformidad para firmar (fire-and-forget)
    const { notificarConformidadParaFirmar } = await import('@/features/notificaciones/notificaciones.service')
    notificarConformidadParaFirmar(conformidad.id_conformidad, dto.id_cliente, dto.id_incidente).catch(console.error)

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
        esta_firmada: 1,
        fecha_conformidad: new Date().toISOString(),
        observaciones: observaciones ?? null,
      })
      .eq('id_conformidad', idConformidad)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al firmar conformidad' }
  }
}

/**
 * Técnico crea la conformidad al completar el trabajo
 * El sistema busca automáticamente el id_cliente del incidente
 */
export async function crearConformidadPorTecnico(idIncidente: number): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    // Verificar que no exista ya una conformidad
    const { data: existing } = await supabase
      .from('conformidades')
      .select('id_conformidad')
      .eq('id_incidente', idIncidente)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Ya existe una conformidad para este incidente' }
    }

    // Obtener id_cliente del incidente
    const { data: incidente, error: errInc } = await supabase
      .from('incidentes')
      .select('id_cliente_reporta')
      .eq('id_incidente', idIncidente)
      .single()

    if (errInc || !incidente) return { success: false, error: 'No se pudo obtener el incidente' }

    const { data: conformidad, error } = await supabase
      .from('conformidades')
      .insert({
        id_incidente: idIncidente,
        id_cliente: incidente.id_cliente_reporta,
        tipo_conformidad: 'final',
        esta_firmada: 0,
      })
      .select('id_conformidad')
      .single()

    if (error) return { success: false, error: error.message }

    // Notificar al cliente (fire-and-forget)
    const { notificarConformidadParaFirmar } = await import('@/features/notificaciones/notificaciones.service')
    notificarConformidadParaFirmar(conformidad.id_conformidad, incidente.id_cliente_reporta, idIncidente).catch(console.error)

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al crear conformidad' }
  }
}
