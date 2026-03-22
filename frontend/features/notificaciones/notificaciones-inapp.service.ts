'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import { requireTecnicoId } from '@/features/auth/auth.service'
import type { ActionResult } from '@/shared/types'
import type { Notificacion } from './notificaciones.types'

/**
 * Obtener notificaciones no leídas del técnico autenticado
 */
export async function getNotificacionesTecnico(): Promise<Notificacion[]> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()

  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('id_tecnico', idTecnico)
    .is('fecha_leida', null)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return (data || []) as Notificacion[]
}

/**
 * Marcar notificación como leída (descartada)
 */
export async function marcarNotificacionLeida(idNotificacion: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireTecnicoId()

    const { error } = await supabase
      .from('notificaciones')
      .update({ fecha_leida: new Date().toISOString() })
      .eq('id_notificacion', idNotificacion)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al marcar notificación' }
  }
}

/**
 * Crear notificación para un técnico (uso interno del sistema, bypass RLS)
 */
export async function crearNotificacion(data: {
  id_tecnico: number
  tipo: string
  titulo: string
  mensaje: string
  id_incidente?: number | null
  id_presupuesto?: number | null
}): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('notificaciones').insert(data)
}
