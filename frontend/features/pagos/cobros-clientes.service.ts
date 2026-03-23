'use server'

/**
 * Servicio de Cobros a Clientes
 * Gestiona el cobro del monto total (con comisión) al cliente una vez resuelto el incidente.
 * El trigger es: conformidad aprobada → incidente resuelto → aparece como pendiente de cobro.
 */

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import type { ActionResult } from '@/shared/types'

export interface PendienteCobroCliente {
  id_presupuesto: number
  id_incidente: number
  id_cliente: number
  nombre_cliente: string
  apellido_cliente: string
  descripcion_problema: string
  categoria: string | null
  monto_cobro: number       // costo_total (incluye comisión)
  fecha_presupuesto: string
}

export interface CobroClienteRegistrado {
  id_cobro: number
  id_incidente: number
  id_presupuesto: number
  id_cliente: number
  monto_cobro: number
  metodo_pago: string
  referencia_pago: string | null
  banco: string | null
  cuotas: number | null
  marcado_por_email: string | null
  marcado_por_nombre: string | null
  observaciones: string | null
  fecha_cobro: string
  fecha_creacion: string
  nombre_cliente?: string
  apellido_cliente?: string
  descripcion_problema?: string
}

/**
 * Presupuestos aprobados con incidente resuelto sin cobro registrado.
 */
export async function getPendientesCobroCliente(): Promise<PendienteCobroCliente[]> {
  const supabase = createAdminClient()

  const { data: presupuestos, error } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto, id_incidente, costo_total, fecha_creacion,
      incidentes!inner (
        id_incidente, descripcion_problema, categoria, estado_actual,
        id_cliente_reporta,
        clientes:id_cliente_reporta (id_cliente, nombre, apellido)
      )
    `)
    .eq('estado_presupuesto', 'aprobado')
    .in('incidentes.estado_actual', ['finalizado', 'resuelto'])
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  if (!presupuestos?.length) return []

  // Filtrar los que ya tienen cobro
  const ids = presupuestos.map(p => p.id_presupuesto)
  const { data: cobrosYaHechos } = await supabase
    .from('cobros_clientes')
    .select('id_presupuesto')
    .in('id_presupuesto', ids)

  const cobradosSet = new Set((cobrosYaHechos || []).map((c: any) => c.id_presupuesto))

  const pendientes: PendienteCobroCliente[] = []
  for (const pres of presupuestos) {
    if (cobradosSet.has(pres.id_presupuesto)) continue
    const inc = pres.incidentes as any
    const cliente = Array.isArray(inc?.clientes) ? inc.clientes[0] : inc?.clientes
    if (!cliente) continue

    pendientes.push({
      id_presupuesto: pres.id_presupuesto,
      id_incidente: pres.id_incidente,
      id_cliente: cliente.id_cliente ?? inc.id_cliente_reporta,
      nombre_cliente: cliente.nombre,
      apellido_cliente: cliente.apellido,
      descripcion_problema: inc.descripcion_problema || '',
      categoria: inc.categoria,
      monto_cobro: Number(pres.costo_total) || 0,
      fecha_presupuesto: pres.fecha_creacion,
    })
  }

  return pendientes
}

/**
 * Cobros ya registrados (historial).
 */
export async function getCobrosClientesRealizados(): Promise<CobroClienteRegistrado[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('cobros_clientes')
    .select(`
      id_cobro, id_incidente, id_presupuesto, id_cliente,
      monto_cobro, metodo_pago, referencia_pago, banco, cuotas,
      marcado_por_email, marcado_por_nombre, observaciones,
      fecha_cobro, fecha_creacion,
      clientes (nombre, apellido),
      incidentes (descripcion_problema)
    `)
    .order('fecha_cobro', { ascending: false })

  if (error) throw error

  return (data || []).map((c: any) => ({
    ...c,
    nombre_cliente: c.clientes?.nombre,
    apellido_cliente: c.clientes?.apellido,
    descripcion_problema: c.incidentes?.descripcion_problema,
  }))
}

/**
 * Registra el cobro al cliente con método de pago y trazabilidad.
 */
export async function registrarCobroCliente(params: {
  idPresupuesto: number
  idIncidente: number
  idCliente: number
  montoCobro: number
  metodoPago: string
  referenciaPago?: string
  banco?: string
  cuotas?: number
  observaciones?: string
}): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const emailAdmin = user?.email ?? null

    let nombreAdmin: string | null = null
    if (user?.id) {
      const adminSupabase = createAdminClient()
      const { data: emp } = await adminSupabase
        .from('empleados')
        .select('nombre, apellido')
        .eq('id_usuario', user.id)
        .maybeSingle()
      if (emp) nombreAdmin = `${emp.nombre} ${emp.apellido}`
    }

    const { error } = await createAdminClient()
      .from('cobros_clientes')
      .insert({
        id_incidente: params.idIncidente,
        id_presupuesto: params.idPresupuesto,
        id_cliente: params.idCliente,
        monto_cobro: params.montoCobro,
        metodo_pago: params.metodoPago,
        referencia_pago: params.referenciaPago ?? null,
        banco: params.banco ?? null,
        cuotas: params.cuotas ?? null,
        marcado_por_email: emailAdmin,
        marcado_por_nombre: nombreAdmin,
        observaciones: params.observaciones ?? null,
        fecha_cobro: new Date().toISOString(),
      })

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al registrar cobro' }
  }
}

// ─── Vista Cliente: mis cobros pendientes y realizados ────────────────────────

export interface MiCobroPendiente {
  id_presupuesto: number
  id_incidente: number
  descripcion_problema: string
  categoria: string | null
  monto_a_pagar: number
  fecha_presupuesto: string
}

export interface MiCobroRealizado {
  id_cobro: number
  id_incidente: number
  id_presupuesto: number
  monto_cobro: number
  metodo_pago: string
  referencia_pago: string | null
  banco: string | null
  cuotas: number | null
  observaciones: string | null
  fecha_cobro: string
  descripcion_problema: string | null
}

/**
 * Cobros pendientes del cliente actual: presupuestos aprobados/resueltos sin cobro registrado.
 */
export async function getMisCobrosComoCliente(): Promise<{ pendientes: MiCobroPendiente[], realizados: MiCobroRealizado[] }> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()

  // Mis incidentes
  const { data: incidentes } = await supabase
    .from('incidentes')
    .select('id_incidente')
    .eq('id_cliente_reporta', idCliente)

  if (!incidentes?.length) return { pendientes: [], realizados: [] }
  const idIncidentes = incidentes.map((i: any) => i.id_incidente)

  // Presupuestos aprobados de mis incidentes
  const { data: presupuestos } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto, id_incidente, costo_total, fecha_creacion,
      incidentes (descripcion_problema, categoria, estado_actual)
    `)
    .in('id_incidente', idIncidentes)
    .eq('estado_presupuesto', 'aprobado')
    .order('fecha_creacion', { ascending: false })

  if (!presupuestos?.length) return { pendientes: [], realizados: [] }

  const idPresupuestos = presupuestos.map((p: any) => p.id_presupuesto)

  // Cobros ya registrados para mis presupuestos
  const { data: cobros } = await supabase
    .from('cobros_clientes')
    .select(`
      id_cobro, id_incidente, id_presupuesto,
      monto_cobro, metodo_pago, referencia_pago, banco, cuotas, observaciones, fecha_cobro,
      incidentes (descripcion_problema)
    `)
    .in('id_presupuesto', idPresupuestos)
    .order('fecha_cobro', { ascending: false })

  const cobradosIds = new Set((cobros || []).map((c: any) => c.id_presupuesto))

  const pendientes: MiCobroPendiente[] = presupuestos
    .filter((p: any) => !cobradosIds.has(p.id_presupuesto))
    .map((p: any) => {
      const inc = p.incidentes as any
      return {
        id_presupuesto: p.id_presupuesto,
        id_incidente: p.id_incidente,
        descripcion_problema: inc?.descripcion_problema || '',
        categoria: inc?.categoria || null,
        monto_a_pagar: Number(p.costo_total) || 0,
        fecha_presupuesto: p.fecha_creacion,
      }
    })

  const realizados: MiCobroRealizado[] = (cobros || []).map((c: any) => ({
    id_cobro: c.id_cobro,
    id_incidente: c.id_incidente,
    id_presupuesto: c.id_presupuesto,
    monto_cobro: Number(c.monto_cobro) || 0,
    metodo_pago: c.metodo_pago,
    referencia_pago: c.referencia_pago,
    banco: c.banco,
    cuotas: c.cuotas,
    observaciones: c.observaciones,
    fecha_cobro: c.fecha_cobro,
    descripcion_problema: (c.incidentes as any)?.descripcion_problema || null,
  }))

  return { pendientes, realizados }
}

import { requireClienteId } from '@/features/auth/auth.service'
