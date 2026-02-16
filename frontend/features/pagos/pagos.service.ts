'use server'

/**
 * Servicio de Pagos
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireAdminOrGestorId } from '@/features/auth/auth.service'
import type { ActionResult } from '@/shared/types'
import type { Pago, PagoConDetalle } from './pagos.types'
import { TipoPago, MetodoPago } from '@/shared/types/enums'

const PAGO_SELECT = `
  id_pago,
  id_presupuesto,
  id_cliente,
  tipo_pago,
  monto,
  metodo_pago,
  numero_referencia,
  comprobante_url,
  fecha_pago,
  fecha_registro,
  observaciones,
  presupuestos (
    id_presupuesto,
    costo_total,
    estado_presupuesto
  ),
  clientes (
    nombre,
    apellido
  )
`

/**
 * Obtener todos los pagos (admin/gestor)
 */
export async function getPagosForAdmin(): Promise<PagoConDetalle[]> {
  const supabase = await createClient()
  await requireAdminOrGestorId()

  const { data, error } = await supabase
    .from('pagos')
    .select(PAGO_SELECT)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return data as unknown as PagoConDetalle[]
}

/**
 * Obtener pagos de un presupuesto
 */
export async function getPagosDelPresupuesto(idPresupuesto: number): Promise<Pago[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pagos')
    .select(PAGO_SELECT)
    .eq('id_presupuesto', idPresupuesto)
    .order('fecha_pago', { ascending: false })

  if (error) throw error
  return data as unknown as Pago[]
}

/**
 * Obtener pagos de un cliente
 */
export async function getPagosDelCliente(idCliente: number): Promise<PagoConDetalle[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pagos')
    .select(PAGO_SELECT)
    .eq('id_cliente', idCliente)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return data as unknown as PagoConDetalle[]
}

/**
 * Obtener un pago específico
 */
export async function getPago(idPago: number): Promise<PagoConDetalle | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pagos')
    .select(PAGO_SELECT)
    .eq('id_pago', idPago)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return (data as unknown as PagoConDetalle) || null
}

// --- Escrituras ---

/**
 * Crear un nuevo pago
 */
export async function crearPago(data: {
  id_presupuesto: number
  id_cliente?: number
  tipo_pago: TipoPago | string
  monto: number
  metodo_pago: MetodoPago | string
  numero_referencia?: string
  comprobante_url?: string
  fecha_pago?: string
  observaciones?: string
}): Promise<ActionResult<Pago>> {
  try {
    const supabase = await createClient()
    await requireAdminOrGestorId()

    const { data: pago, error } = await supabase
      .from('pagos')
      .insert({
        ...data,
        fecha_registro: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: pago as Pago }
  } catch (error) {
    return { success: false, error: 'Error inesperado al crear pago' }
  }
}

/**
 * Actualizar pago
 */
export async function actualizarPago(
  idPago: number,
  updates: {
    tipo_pago?: TipoPago | string
    monto?: number
    metodo_pago?: MetodoPago | string
    numero_referencia?: string
    comprobante_url?: string
    fecha_pago?: string
    observaciones?: string
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireAdminOrGestorId()

    const { error } = await supabase
      .from('pagos')
      .update(updates)
      .eq('id_pago', idPago)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar pago' }
  }
}

/**
 * Eliminar pago
 */
export async function eliminarPago(idPago: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    await requireAdminOrGestorId()

    const { error } = await supabase
      .from('pagos')
      .delete()
      .eq('id_pago', idPago)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al eliminar pago' }
  }
}
