'use server'

/**
 * Servicio de Avances de Reparación
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { translateDbError } from '@/shared/lib/db-errors'
import { createClient } from '@/shared/lib/supabase/server'
import { requireTecnicoId } from '@/features/auth/auth.service'
import type { ActionResult } from '@/shared/types'
import type { AvanceConDetalle, CreateAvanceDTO } from './avances.types'

const AVANCE_SELECT = `
  id_avance,
  id_incidente,
  id_tecnico,
  descripcion_avance,
  porcentaje_completado,
  fecha_avance,
  tecnicos (
    nombre,
    apellido
  )
`

/**
 * Obtener avances de un incidente
 */
export async function getAvancesDelIncidente(idIncidente: number): Promise<AvanceConDetalle[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('avances_reparacion')
    .select(AVANCE_SELECT)
    .eq('id_incidente', idIncidente)
    .order('fecha_avance', { ascending: true })

  if (error) throw error
  return data as unknown as AvanceConDetalle[]
}

/**
 * Registrar un nuevo avance (técnico)
 */
export async function crearAvance(dto: CreateAvanceDTO): Promise<ActionResult> {
  try {
    const idTecnico = await requireTecnicoId()
    const { createAdminClient } = await import('@/shared/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data: avance, error } = await supabase
      .from('avances_reparacion')
      .insert({
        id_incidente: dto.id_incidente,
        id_tecnico: idTecnico,
        descripcion_avance: dto.descripcion_avance,
        porcentaje_completado: dto.porcentaje_completado ?? null,
        fecha_avance: new Date().toISOString(),
      })
      .select('id_avance')
      .single()

    if (error) return { success: false, error: translateDbError(error) }

    // Notificar al cliente sobre el nuevo avance (fire-and-forget)
    const { notificarNuevoAvance } = await import('@/features/notificaciones/notificaciones.service')
    notificarNuevoAvance(avance.id_avance, dto.id_incidente).catch(console.error)

    // Notificación in-app al cliente: necesitamos id_cliente_reporta del incidente
    try {
      const { data: inc } = await supabase
        .from('incidentes')
        .select('id_cliente_reporta')
        .eq('id_incidente', dto.id_incidente)
        .single()
      if (inc?.id_cliente_reporta) {
        const { crearNotificacionCliente } = await import('@/features/notificaciones/notificaciones-inapp.service')
        await crearNotificacionCliente({
          id_cliente: inc.id_cliente_reporta,
          tipo: 'nuevo_avance',
          titulo: 'Nuevo avance en tu incidente',
          mensaje: `El técnico cargó un nuevo avance en el incidente #${dto.id_incidente}.`,
          id_incidente: dto.id_incidente,
        })
      }
    } catch { /* no bloquear la operación principal */ }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al registrar avance' }
  }
}

/**
 * Eliminar un avance (técnico, solo los propios)
 */
export async function eliminarAvance(idAvance: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('avances_reparacion')
      .delete()
      .eq('id_avance', idAvance)

    if (error) return { success: false, error: translateDbError(error) }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al eliminar avance' }
  }
}
