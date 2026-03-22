'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import { requireTecnicoId, requireClienteId } from '@/features/auth/auth.service'
import type { ActionResult } from '@/shared/types'
import type { Notificacion } from './notificaciones.types'

// ─── TÉCNICO ──────────────────────────────────────────────────────────────────

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
 * Contar notificaciones no leídas del técnico autenticado
 */
export async function contarNotificacionesTecnico(): Promise<number> {
  try {
    const supabase = await createClient()
    const idTecnico = await requireTecnicoId()
    const { count } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('id_tecnico', idTecnico)
      .is('fecha_leida', null)
    return count ?? 0
  } catch {
    return 0
  }
}

// ─── CLIENTE ──────────────────────────────────────────────────────────────────

/**
 * Obtener notificaciones no leídas del cliente autenticado
 */
export async function getNotificacionesCliente(): Promise<Notificacion[]> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()

  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('id_cliente', idCliente)
    .is('fecha_leida', null)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return (data || []) as Notificacion[]
}

/**
 * Contar notificaciones no leídas del cliente autenticado
 */
export async function contarNotificacionesCliente(): Promise<number> {
  try {
    const supabase = await createClient()
    const idCliente = await requireClienteId()
    const { count } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('id_cliente', idCliente)
      .is('fecha_leida', null)
    return count ?? 0
  } catch {
    return 0
  }
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/**
 * Obtener notificaciones no leídas para el admin
 */
export async function getNotificacionesAdmin(): Promise<Notificacion[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('para_admin', true)
    .is('fecha_leida', null)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return (data || []) as Notificacion[]
}

/**
 * Contar notificaciones no leídas para el admin
 */
export async function contarNotificacionesAdmin(): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { count } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('para_admin', true)
      .is('fecha_leida', null)
    return count ?? 0
  } catch {
    return 0
  }
}

// ─── MARCAR LEÍDA (todos los roles) ──────────────────────────────────────────

/**
 * Marcar notificación como leída
 */
export async function marcarNotificacionLeida(idNotificacion: number): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

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
 * Marcar todas las notificaciones como leídas para un rol
 */
export async function marcarTodasLeidas(rol: 'tecnico' | 'cliente' | 'admin'): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()
    let query = supabase.from('notificaciones').update({ fecha_leida: new Date().toISOString() }).is('fecha_leida', null)

    if (rol === 'tecnico') {
      const idTecnico = await requireTecnicoId()
      query = query.eq('id_tecnico', idTecnico) as any
    } else if (rol === 'cliente') {
      const idCliente = await requireClienteId()
      query = query.eq('id_cliente', idCliente) as any
    } else {
      query = query.eq('para_admin', true) as any
    }

    const { error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al marcar notificaciones' }
  }
}

// ─── CREAR (uso interno del sistema, bypass RLS) ─────────────────────────────

/**
 * Crear notificación para un técnico
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
  await supabase.from('notificaciones').insert({ ...data, para_admin: false })
}

/**
 * Crear notificación para un cliente
 */
export async function crearNotificacionCliente(data: {
  id_cliente: number
  tipo: string
  titulo: string
  mensaje: string
  id_incidente?: number | null
  id_presupuesto?: number | null
}): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('notificaciones').insert({ ...data, para_admin: false })
}

/**
 * Crear notificación para el admin (todos los admins la ven)
 */
export async function crearNotificacionAdmin(data: {
  tipo: string
  titulo: string
  mensaje: string
  id_incidente?: number | null
  id_presupuesto?: number | null
}): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('notificaciones').insert({ ...data, para_admin: true })
}
