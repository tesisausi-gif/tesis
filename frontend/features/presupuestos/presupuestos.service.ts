'use server'

/**
 * Servicio de Presupuestos
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireAdminOrGestorId, requireTecnicoId } from '@/features/auth/auth.service'
import type { ActionResult } from '@/shared/types'
import { EstadoPresupuesto } from '@/shared/types/enums'
import type { Presupuesto, PresupuestoConDetalle } from './presupuestos.types'

const PRESUPUESTO_SELECT = `
  id_presupuesto,
  id_incidente,
  id_inspeccion,
  descripcion_detallada,
  costo_materiales,
  costo_mano_obra,
  gastos_administrativos,
  costo_total,
  estado_presupuesto,
  fecha_aprobacion,
  id_aprobado_por,
  alternativas_reparacion,
  fecha_creacion,
  fecha_modificacion,
  incidentes (
    id_incidente,
    descripcion_problema,
    categoria,
    id_cliente_reporta
  )
`

/**
 * Obtener todos los presupuestos (admin/gestor)
 */
export async function getPresupuestosForAdmin(): Promise<PresupuestoConDetalle[]> {
  const supabase = await createClient()
  await requireAdminOrGestorId()

  const { data, error } = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as unknown as PresupuestoConDetalle[]
}

/**
 * Obtener presupuestos de un incidente específico
 */
export async function getPresupuestosDelIncidente(idIncidente: number): Promise<Presupuesto[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .eq('id_incidente', idIncidente)
    .order('fecha_creacion', { ascending: true })

  if (error) throw error
  return data as unknown as Presupuesto[]
}

/**
 * Obtener presupuestos del técnico actual.
 * Busca a través de las asignaciones del técnico para encontrar los incidentes relacionados.
 */
export async function getPresupuestosDeTecnico(): Promise<PresupuestoConDetalle[]> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()

  const { data: asignaciones, error: asigError } = await supabase
    .from('asignaciones_tecnico')
    .select('id_incidente')
    .eq('id_tecnico', idTecnico)

  if (asigError) throw asigError
  if (!asignaciones?.length) return []

  const idIncidentes = asignaciones.map((a: any) => a.id_incidente).filter(Boolean)
  if (!idIncidentes.length) return []

  const { data, error } = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .in('id_incidente', idIncidentes)
    .in('estado_presupuesto', [EstadoPresupuesto.ENVIADO, EstadoPresupuesto.APROBADO_ADMIN])
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as unknown as PresupuestoConDetalle[]
}

/**
 * Obtener presupuestos de los incidentes de un cliente
 */
export async function getPresupuestosDelCliente(idCliente: number): Promise<PresupuestoConDetalle[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto,
      id_incidente,
      id_inspeccion,
      descripcion_detallada,
      costo_materiales,
      costo_mano_obra,
      gastos_administrativos,
      costo_total,
      estado_presupuesto,
      fecha_aprobacion,
      id_aprobado_por,
      alternativas_reparacion,
      fecha_creacion,
      fecha_modificacion,
      incidentes!inner (
        id_incidente,
        descripcion_problema,
        categoria,
        id_cliente_reporta
      )
    `)
    .eq('incidentes.id_cliente_reporta', idCliente)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as unknown as PresupuestoConDetalle[]
}

/**
 * Obtener un presupuesto específico
 */
export async function getPresupuesto(idPresupuesto: number): Promise<PresupuestoConDetalle | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .eq('id_presupuesto', idPresupuesto)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return (data as unknown as PresupuestoConDetalle) || null
}

// --- Escrituras ---

/**
 * Crear un nuevo presupuesto
 */
export async function crearPresupuesto(data: {
  id_incidente: number
  id_inspeccion?: number | null
  descripcion_detallada: string
  costo_total: number
  costo_materiales?: number
  costo_mano_obra?: number
  gastos_administrativos?: number
  alternativas_reparacion?: string
}): Promise<ActionResult<Presupuesto>> {
  try {
    const supabase = await createClient()

    const { data: presupuesto, error } = await supabase
      .from('presupuestos')
      .insert({
        ...data,
        estado_presupuesto: EstadoPresupuesto.ENVIADO,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    // Notificar al cliente (fire-and-forget)
    const { notificarPresupuestoCreado } = await import('@/features/notificaciones/notificaciones.service')
    notificarPresupuestoCreado(presupuesto.id_presupuesto).catch(console.error)

    return { success: true, data: presupuesto as Presupuesto }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear presupuesto' }
  }
}

/**
 * Actualizar presupuesto (solo en estado enviado)
 */
export async function actualizarPresupuesto(
  idPresupuesto: number,
  updates: {
    descripcion_detallada?: string
    costo_total?: number
    costo_materiales?: number
    costo_mano_obra?: number
    gastos_administrativos?: number
    alternativas_reparacion?: string
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const presupuesto = await getPresupuesto(idPresupuesto)
    if (!presupuesto) {
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (presupuesto.estado_presupuesto !== EstadoPresupuesto.ENVIADO) {
      return { success: false, error: 'No se puede editar un presupuesto en este estado' }
    }

    const { error } = await supabase
      .from('presupuestos')
      .update(updates)
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar presupuesto' }
  }
}

/**
 * Enviar presupuesto (marcar como enviado)
 */
export async function enviarPresupuesto(idPresupuesto: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('presupuestos')
      .update({ estado_presupuesto: EstadoPresupuesto.ENVIADO })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al enviar presupuesto' }
  }
}

/**
 * Aprobar presupuesto (admin/gestor)
 */
export async function aprobarPresupuesto(idPresupuesto: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireAdminOrGestorId()

    const { error } = await supabase
      .from('presupuestos')
      .update({
        estado_presupuesto: EstadoPresupuesto.APROBADO,
        fecha_aprobacion: new Date().toISOString(),
      })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }

    // Notificar al cliente que puede revisar y aprobar (fire-and-forget)
    const { notificarPresupuestoAprobadoAdmin } = await import('@/features/notificaciones/notificaciones.service')
    notificarPresupuestoAprobadoAdmin(idPresupuesto).catch(console.error)

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al aprobar presupuesto' }
  }
}

/**
 * Rechazar presupuesto (admin/gestor)
 */
export async function rechazarPresupuesto(
  idPresupuesto: number,
  _razonRechazo?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireAdminOrGestorId()

    const { error } = await supabase
      .from('presupuestos')
      .update({ estado_presupuesto: EstadoPresupuesto.RECHAZADO })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }

    // Notificar al cliente que el presupuesto fue rechazado (fire-and-forget)
    const { notificarPresupuestoRechazado } = await import('@/features/notificaciones/notificaciones.service')
    notificarPresupuestoRechazado(idPresupuesto).catch(console.error)

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al rechazar presupuesto' }
  }
}

/**
 * Marcar presupuesto como vencido
 */
export async function marcarPresupuestoVencido(idPresupuesto: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireAdminOrGestorId()

    const { error } = await supabase
      .from('presupuestos')
      .update({ estado_presupuesto: EstadoPresupuesto.VENCIDO })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al marcar presupuesto como vencido' }
  }
}

/**
 * Aprobar presupuesto como cliente (cambiar de aprobado_admin a aprobado)
 */
export async function aprobarPresupuestoCliente(idPresupuesto: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const presupuesto = await getPresupuesto(idPresupuesto)
    if (!presupuesto) {
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (presupuesto.estado_presupuesto !== EstadoPresupuesto.APROBADO_ADMIN) {
      return { success: false, error: 'El presupuesto no está listo para aprobación del cliente' }
    }

    const { error } = await supabase
      .from('presupuestos')
      .update({
        estado_presupuesto: EstadoPresupuesto.APROBADO,
        fecha_aprobacion: new Date().toISOString(),
      })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al aprobar presupuesto' }
  }
}

/**
 * Rechazar presupuesto como cliente
 */
export async function rechazarPresupuestoCliente(
  idPresupuesto: number,
  _razonRechazo?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const presupuesto = await getPresupuesto(idPresupuesto)
    if (!presupuesto) {
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (presupuesto.estado_presupuesto !== EstadoPresupuesto.APROBADO_ADMIN) {
      return { success: false, error: 'El presupuesto no puede ser rechazado en este estado' }
    }

    const { error } = await supabase
      .from('presupuestos')
      .update({ estado_presupuesto: EstadoPresupuesto.RECHAZADO })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al rechazar presupuesto' }
  }
}
