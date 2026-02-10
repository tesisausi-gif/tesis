'use server'

/**
 * Servicio de Presupuestos
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireAdminOrGestorId, requireTecnicoId } from '@/features/auth/auth.service'
import type { ActionResult } from '@/shared/types'
import { EstadoPresupuesto, Presupuesto, PresupuestoConDetalle } from './presupuestos.types'

const PRESUPUESTO_SELECT = `
  id_presupuesto,
  id_incidente,
  id_tecnico,
  descripcion_trabajo,
  costo_total,
  detalles_trabajo,
  estado_presupuesto,
  fecha_creacion,
  fecha_vencimiento,
  fecha_aprobacion,
  fecha_rechazo,
  razon_rechazo,
  fecha_actualizacion,
  incidentes (
    id_incidente,
    descripcion_problema,
    categoria
  ),
  tecnicos (
    nombre,
    apellido
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
 * Obtener presupuestos del técnico actual
 */
export async function getPresupuestosDeTecnico(): Promise<PresupuestoConDetalle[]> {
  const supabase = await createClient()
  const idTecnico = await requireTecnicoId()

  const { data, error } = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .eq('id_tecnico', idTecnico)
    .in('estado_presupuesto', ['borrador', 'enviado', 'aprobado_admin'])
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as unknown as PresupuestoConDetalle[]
}

/**
 * Obtener presupuestos de los incidentes de un cliente (para que vea los presupuestos)
 */
export async function getPresupuestosDelCliente(idCliente: number): Promise<PresupuestoConDetalle[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('presupuestos')
    .select(`
      ${PRESUPUESTO_SELECT}
    `)

    .eq('incidentes.id_cliente_reporta', idCliente)
    .order('presupuestos.fecha_creacion', { ascending: false })

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

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
  return (data as unknown as PresupuestoConDetalle) || null
}

// --- Escrituras ---

/**
 * Crear un nuevo presupuesto
 */
export async function crearPresupuesto(data: {
  id_incidente: number
  id_tecnico: number
  descripcion_trabajo: string
  costo_total: number
  detalles_trabajo?: string
  fecha_vencimiento?: string
}): Promise<ActionResult<Presupuesto>> {
  try {
    const supabase = await createClient()

    const { data: presupuesto, error } = await supabase
      .from('presupuestos')
      .insert({
        ...data,
        estado_presupuesto: EstadoPresupuesto.BORRADOR,
        fecha_creacion: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: presupuesto as Presupuesto }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear presupuesto' }
  }
}

/**
 * Actualizar presupuesto (solo en estado borrador o enviado)
 */
export async function actualizarPresupuesto(
  idPresupuesto: number,
  updates: {
    descripcion_trabajo?: string
    detalles_trabajo?: string
    costo_total?: number
    fecha_vencimiento?: string
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Verificar que está en estado editable
    const presupuesto = await getPresupuesto(idPresupuesto)
    if (!presupuesto) {
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (
      presupuesto.estado_presupuesto !== EstadoPresupuesto.BORRADOR &&
      presupuesto.estado_presupuesto !== EstadoPresupuesto.ENVIADO
    ) {
      return { success: false, error: 'No se puede editar un presupuesto en este estado' }
    }

    const { error } = await supabase
      .from('presupuestos')
      .update({
        ...updates,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar presupuesto' }
  }
}

/**
 * Enviar presupuesto (cambiar de borrador a enviado)
 */
export async function enviarPresupuesto(idPresupuesto: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('presupuestos')
      .update({
        estado_presupuesto: EstadoPresupuesto.ENVIADO,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id_presupuesto', idPresupuesto)
      .eq('estado_presupuesto', EstadoPresupuesto.BORRADOR)

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
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
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
  razonRechazo?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireAdminOrGestorId()

    const { error } = await supabase
      .from('presupuestos')
      .update({
        estado_presupuesto: EstadoPresupuesto.RECHAZADO,
        fecha_rechazo: new Date().toISOString(),
        razon_rechazo: razonRechazo || null,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
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
      .update({
        estado_presupuesto: EstadoPresupuesto.VENCIDO,
        fecha_actualizacion: new Date().toISOString(),
      })
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

    // Verificar que el presupuesto esté en estado aprobado_admin
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
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al aprobar presupuesto' }
  }
}

/**
 * Rechazar presupuesto como cliente (cambiar a rechazado)
 */
export async function rechazarPresupuestoCliente(
  idPresupuesto: number,
  razonRechazo?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Verificar que el presupuesto esté en estado aprobado_admin
    const presupuesto = await getPresupuesto(idPresupuesto)
    if (!presupuesto) {
      return { success: false, error: 'Presupuesto no encontrado' }
    }

    if (presupuesto.estado_presupuesto !== EstadoPresupuesto.APROBADO_ADMIN) {
      return { success: false, error: 'El presupuesto no puede ser rechazado en este estado' }
    }

    const { error } = await supabase
      .from('presupuestos')
      .update({
        estado_presupuesto: EstadoPresupuesto.RECHAZADO,
        fecha_rechazo: new Date().toISOString(),
        razon_rechazo: razonRechazo || 'Rechazado por cliente',
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id_presupuesto', idPresupuesto)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al rechazar presupuesto' }
  }
}
