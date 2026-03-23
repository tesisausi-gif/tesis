'use server'

/**
 * Servicio de Incidentes
 * Lecturas y escrituras para Server Components y Server Actions
 */

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import { requireClienteId } from '@/features/auth/auth.service'
import type { Incidente, IncidenteConCliente, IncidenteConDetalles, MetricasDashboard, FiltrosMetricas } from './incidentes.types'
import type { ActionResult } from '@/shared/types'

// Select base para incidentes
const INCIDENTE_SELECT = `
  id_incidente,
  descripcion_problema,
  categoria,
  nivel_prioridad,
  estado_actual,
  fecha_registro,
  fecha_cierre,
  fue_resuelto,
  disponibilidad,
  id_propiedad,
  id_cliente_reporta,
  inmuebles (
    calle,
    altura,
    piso,
    dpto,
    barrio,
    localidad
  )
`

/**
 * Obtener todos los incidentes (admin)
 */
export async function getIncidentesForAdmin(): Promise<IncidenteConCliente[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('incidentes')
    .select(`
      ${INCIDENTE_SELECT},
      clientes:id_cliente_reporta (
        nombre,
        apellido,
        telefono
      ),
      asignaciones_tecnico (
        estado_asignacion,
        tecnicos (
          nombre,
          apellido
        )
      )
    `)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return data as unknown as IncidenteConCliente[]
}

/**
 * Obtener incidentes del cliente actual
 */
export async function getIncidentesByCurrentUser(): Promise<Incidente[]> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()

  const { data, error } = await supabase
    .from('incidentes')
    .select(INCIDENTE_SELECT)
    .eq('id_cliente_reporta', idCliente)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return data as unknown as Incidente[]
}

/**
 * Obtener incidente por ID con todos los detalles
 */
export async function getIncidenteById(idIncidente: number): Promise<IncidenteConDetalles> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('incidentes')
    .select(`
      ${INCIDENTE_SELECT},
      clientes:id_cliente_reporta (
        nombre,
        apellido,
        telefono
      ),
      asignaciones_tecnico (
        id_asignacion,
        estado_asignacion,
        fecha_asignacion,
        tecnicos (
          nombre,
          apellido
        )
      )
    `)
    .eq('id_incidente', idIncidente)
    .single()

  if (error) throw error
  return data as unknown as IncidenteConDetalles
}

/**
 * Obtener incidente completo para el modal de detalle
 */
export async function getIncidenteCompleto(idIncidente: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('incidentes')
    .select(`
      *,
      inmuebles:id_propiedad (
        calle, altura, piso, dpto, barrio, localidad, provincia,
        tipos_inmuebles (nombre)
      ),
      clientes:id_cliente_reporta (
        nombre, apellido, correo_electronico, telefono
      )
    `)
    .eq('id_incidente', idIncidente)
    .single()

  if (error) throw error
  return data
}

/**
 * Obtener asignaciones de un incidente con datos del técnico
 */
export async function getAsignacionesDelIncidente(idIncidente: number) {
  // Usa adminClient para garantizar el join con tecnicos sin importar el rol del usuario
  const { createAdminClient } = await import('@/shared/lib/supabase/admin')
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select('*, tecnicos(nombre, apellido, especialidad, telefono, correo_electronico)')
    .eq('id_incidente', idIncidente)
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtener datos de timeline (inspecciones, presupuestos, pagos) de un incidente
 */
export async function getTimelineData(idIncidente: number) {
  // Usa adminClient para bypassear RLS y poder leer datos de todos los roles
  const { createAdminClient } = await import('@/shared/lib/supabase/admin')
  const supabase = createAdminClient()

  const [inspecciones, presupuestos, pagos, avances, conformidades] = await Promise.all([
    supabase
      .from('inspecciones')
      .select('*, tecnicos(nombre, apellido)')
      .eq('id_incidente', idIncidente)
      .eq('esta_anulada', false)
      .order('fecha_inspeccion', { ascending: true }),
    supabase
      .from('presupuestos')
      .select('*')
      .eq('id_incidente', idIncidente)
      .order('fecha_creacion', { ascending: true }),
    supabase
      .from('pagos')
      .select('*')
      .eq('id_incidente', idIncidente)
      .order('fecha_pago', { ascending: true }),
    supabase
      .from('avances_reparacion')
      .select('*, tecnicos(nombre, apellido)')
      .eq('id_incidente', idIncidente)
      .order('fecha_avance', { ascending: true }),
    supabase
      .from('conformidades')
      .select('id_conformidad, fecha_creacion, fecha_conformidad, fecha_rechazo, esta_firmada, esta_rechazada, url_documento')
      .eq('id_incidente', idIncidente)
      .order('fecha_creacion', { ascending: true }),
  ])

  return {
    inspecciones: inspecciones.data || [],
    presupuestos: presupuestos.data || [],
    pagos: pagos.data || [],
    avances: avances.data || [],
    conformidades: conformidades.data || [],
  }
}

/**
 * Obtener estadísticas para el dashboard admin
 */
export async function getDashboardStats() {
  const { createAdminClient } = await import('@/shared/lib/supabase/admin')
  const supabase = createAdminClient()

  const [incidentes, propiedades, clientes, tecnicos] = await Promise.all([
    supabase.from('incidentes').select('estado_actual'),
    supabase.from('inmuebles').select('*', { count: 'exact', head: true }).eq('esta_activo', true),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('esta_activo', true),
    supabase.from('tecnicos').select('*', { count: 'exact', head: true }).eq('esta_activo', true),
  ])

  const incidentesData = incidentes.data || []

  return {
    incidentesPendientes: incidentesData.filter(i => i.estado_actual === 'pendiente').length,
    incidentesEnProceso: incidentesData.filter(i => i.estado_actual === 'en_proceso').length,
    incidentesResueltos: incidentesData.filter(i => i.estado_actual === 'resuelto').length,
    propiedades: propiedades.count || 0,
    clientes: clientes.count || 0,
    tecnicos: tecnicos.count || 0,
  }
}

/**
 * Obtener actividad reciente para el dashboard admin
 */
export async function getDashboardActividad() {
  const { createAdminClient } = await import('@/shared/lib/supabase/admin')
  const supabase = createAdminClient()

  const [incidentes, asignaciones] = await Promise.all([
    supabase
      .from('incidentes')
      .select(`
        id_incidente,
        descripcion_problema,
        estado_actual,
        fecha_registro,
        clientes:id_cliente_reporta (nombre, apellido),
        inmuebles:id_propiedad (calle, altura)
      `)
      .order('fecha_registro', { ascending: false })
      .limit(5),
    supabase
      .from('asignaciones_tecnico')
      .select(`
        id_asignacion,
        fecha_asignacion,
        fecha_creacion,
        tecnicos (nombre, apellido),
        incidentes (id_incidente, descripcion_problema)
      `)
      .order('fecha_creacion', { ascending: false })
      .limit(5),
  ])

  return {
    incidentesRecientes: incidentes.data || [],
    asignacionesRecientes: asignaciones.data || [],
  }
}

/**
 * Obtener incidentes de un inmueble específico
 */
export async function getIncidentesByInmueble(idInmueble: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('incidentes')
    .select(`
      id_incidente,
      descripcion_problema,
      estado_actual,
      nivel_prioridad,
      categoria,
      fecha_registro,
      asignaciones_tecnico (
        tecnicos (nombre, apellido)
      )
    `)
    .eq('id_propiedad', idInmueble)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return data || []
}

// --- Escrituras ---

export async function actualizarIncidente(
  idIncidente: number,
  updates: {
    estado_actual?: string
    nivel_prioridad?: string
    categoria?: string | null
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('incidentes')
      .update(updates)
      .eq('id_incidente', idIncidente)

    if (error) return { success: false, error: error.message }

    // Notificar al cliente si el incidente fue marcado como resuelto (fire-and-forget)
    if (updates.estado_actual === 'resuelto') {
      const { notificarIncidenteResuelto } = await import('@/features/notificaciones/notificaciones.service')
      notificarIncidenteResuelto(idIncidente).catch(console.error)
    }

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: 'Error inesperado al actualizar incidente' }
  }
}

/**
 * Calificación del área técnica (admin) sobre la resolución de un incidente
 */
export async function calificarIncidenteAdmin(
  idIncidente: number,
  estrellas: number,
  comentario?: string | null
): Promise<ActionResult> {
  try {
    if (estrellas < 1 || estrellas > 5) {
      return { success: false, error: 'La calificación debe ser entre 1 y 5' }
    }
    const supabase = await createClient()
    const { error } = await supabase
      .from('incidentes')
      .update({
        calificacion_admin: estrellas,
        comentario_admin: comentario ?? null,
      })
      .eq('id_incidente', idIncidente)

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al guardar calificación' }
  }
}

/**
 * Métricas avanzadas para el dashboard admin, con filtros opcionales
 */
export async function getMetricasDashboard(filtros?: FiltrosMetricas): Promise<MetricasDashboard> {
  const { createAdminClient } = await import('@/shared/lib/supabase/admin')
  const supabase = createAdminClient()

  let incidentesQuery = supabase
    .from('incidentes')
    .select('id_incidente, estado_actual, categoria, nivel_prioridad, fecha_registro, fecha_cierre, fue_resuelto')

  if (filtros?.fechaDesde) {
    incidentesQuery = incidentesQuery.gte('fecha_registro', filtros.fechaDesde)
  }
  if (filtros?.fechaHasta) {
    incidentesQuery = incidentesQuery.lte('fecha_registro', filtros.fechaHasta)
  }
  if (filtros?.categoria) {
    incidentesQuery = incidentesQuery.eq('categoria', filtros.categoria)
  }

  const [incidentesRes, asignacionesRes] = await Promise.all([
    incidentesQuery,
    supabase
      .from('asignaciones_tecnico')
      .select('id_asignacion, estado_asignacion, tecnicos(nombre, apellido)')
      .eq('estado_asignacion', 'completada'),
  ])

  const incidentes = incidentesRes.data || []
  const asignaciones = asignacionesRes.data || []

  // Incidentes por mes (últimos 6 meses)
  const ahora = new Date()
  const incidentesPorMes = Array.from({ length: 6 }, (_, i) => {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1)
    const año = fecha.getFullYear()
    const mes = fecha.getMonth()
    const nombre = fecha.toLocaleString('es-AR', { month: 'short', year: '2-digit' })
    const enMes = incidentes.filter(inc => {
      const f = new Date(inc.fecha_registro)
      return f.getFullYear() === año && f.getMonth() === mes
    })
    return {
      mes: nombre,
      total: enMes.length,
      resueltos: enMes.filter(i => i.fue_resuelto).length,
    }
  })

  // Distribución por categoría
  const categoriasMap: Record<string, number> = {}
  incidentes.forEach(inc => {
    const cat = inc.categoria || 'Sin categoría'
    categoriasMap[cat] = (categoriasMap[cat] || 0) + 1
  })
  const distribucionCategorias = Object.entries(categoriasMap)
    .map(([categoria, count]) => ({ categoria, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // Distribución por prioridad
  const prioridadesMap: Record<string, number> = {}
  incidentes.forEach(inc => {
    const pri = inc.nivel_prioridad || 'Sin prioridad'
    prioridadesMap[pri] = (prioridadesMap[pri] || 0) + 1
  })
  const distribucionPrioridades = Object.entries(prioridadesMap)
    .map(([prioridad, count]) => ({ prioridad, count }))
    .sort((a, b) => b.count - a.count)

  // Tiempo promedio de resolución (días)
  const resueltos = incidentes.filter(inc => inc.fue_resuelto && inc.fecha_cierre)
  const tiempoPromedioResolucion = resueltos.length > 0
    ? Math.round(
        resueltos.reduce((acc, inc) => {
          const dias = (new Date(inc.fecha_cierre!).getTime() - new Date(inc.fecha_registro).getTime()) / (1000 * 60 * 60 * 24)
          return acc + dias
        }, 0) / resueltos.length * 10
      ) / 10
    : 0

  // Top técnicos por incidentes resueltos
  const tecnicosMap: Record<string, { nombre: string; apellido: string; count: number }> = {}
  for (const asig of asignaciones as any[]) {
    if (!asig.tecnicos) continue
    const tec = Array.isArray(asig.tecnicos) ? asig.tecnicos[0] : asig.tecnicos
    if (!tec) continue
    const key = `${tec.nombre}_${tec.apellido}`
    if (!tecnicosMap[key]) tecnicosMap[key] = { nombre: tec.nombre, apellido: tec.apellido, count: 0 }
    tecnicosMap[key].count++
  }
  const topTecnicos = Object.values(tecnicosMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(t => ({ nombre: t.nombre, apellido: t.apellido, incidentesResueltos: t.count }))

  return {
    incidentesPorMes,
    distribucionCategorias,
    distribucionPrioridades,
    tiempoPromedioResolucion,
    topTecnicos,
    totalIncidentes: incidentes.length,
  }
}

export interface EventoTimeline {
  fecha: string
  titulo: string
  descripcion: string
  tipo: 'registro' | 'asignacion' | 'presupuesto' | 'conformidad' | 'pago' | 'calificacion'
}

/**
 * Construye el timeline cronológico de un incidente para la vista admin.
 */
export async function getTimelineIncidente(idIncidente: number): Promise<EventoTimeline[]> {
  const supabase = createAdminClient()
  const eventos: EventoTimeline[] = []

  // 1. El incidente en sí
  const { data: inc } = await supabase
    .from('incidentes')
    .select('fecha_registro, descripcion_problema, categoria, estado_actual')
    .eq('id_incidente', idIncidente)
    .single()
  if (inc) {
    eventos.push({ fecha: inc.fecha_registro, titulo: 'Incidente reportado', descripcion: inc.descripcion_problema, tipo: 'registro' })
  }

  // 2. Asignaciones
  const { data: asigs } = await supabase
    .from('asignaciones_tecnico')
    .select('fecha_asignacion, estado_asignacion, tecnicos(nombre, apellido)')
    .eq('id_incidente', idIncidente)
    .order('fecha_asignacion')
  for (const a of (asigs || [])) {
    const tec = Array.isArray(a.tecnicos) ? a.tecnicos[0] : a.tecnicos
    eventos.push({
      fecha: a.fecha_asignacion,
      titulo: `Técnico asignado: ${tec?.nombre ?? ''} ${tec?.apellido ?? ''}`.trim(),
      descripcion: `Estado: ${a.estado_asignacion}`,
      tipo: 'asignacion',
    })
  }

  // 3. Presupuestos
  const { data: pres } = await supabase
    .from('presupuestos')
    .select('fecha_creacion, estado_presupuesto, costo_total')
    .eq('id_incidente', idIncidente)
    .order('fecha_creacion')
  for (const p of (pres || [])) {
    const AR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
    eventos.push({
      fecha: p.fecha_creacion,
      titulo: 'Presupuesto creado',
      descripcion: `${p.estado_presupuesto} — ${AR.format(p.costo_total ?? 0)}`,
      tipo: 'presupuesto',
    })
  }

  // 4. Conformidades
  const { data: conf } = await supabase
    .from('conformidades')
    .select('fecha_creacion, tipo_conformidad, esta_firmada')
    .eq('id_incidente', idIncidente)
    .order('fecha_creacion')
  for (const c of (conf || [])) {
    eventos.push({
      fecha: c.fecha_creacion,
      titulo: 'Conformidad subida',
      descripcion: `Tipo: ${c.tipo_conformidad ?? '—'} — ${c.esta_firmada ? 'Firmada' : 'Sin firmar'}`,
      tipo: 'conformidad',
    })
  }

  // 5. Pagos al técnico
  const { data: pagos } = await supabase
    .from('pagos_tecnicos')
    .select('fecha_pago, monto_pago, tecnicos(nombre, apellido)')
    .eq('id_incidente', idIncidente)
    .order('fecha_pago')
  for (const p of (pagos || [])) {
    const tec = Array.isArray(p.tecnicos) ? p.tecnicos[0] : p.tecnicos
    const AR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
    eventos.push({
      fecha: p.fecha_pago,
      titulo: `Pago al técnico: ${tec?.nombre ?? ''} ${tec?.apellido ?? ''}`.trim(),
      descripcion: AR.format(p.monto_pago ?? 0),
      tipo: 'pago',
    })
  }

  // Ordenar por fecha
  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha))
}
