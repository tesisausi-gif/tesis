'use server'

/**
 * Servicio de Reportes
 * Datos agregados para los 8 informes de valor agregado del sistema ISBA
 */

import { createAdminClient } from '@/shared/lib/supabase/admin'

// ─── 1. Rendimiento de Técnicos ───────────────────────────────────────────────

export interface RendimientoTecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  especialidad: string | null
  totalAsignaciones: number
  aceptadas: number
  rechazadas: number
  completadas: number
  tasaAceptacion: number       // porcentaje
  tiempoPromedioAceptacionHs: number | null  // horas
  calificacionPromedio: number | null
  cantCalificaciones: number
}

export async function getRendimientoTecnicos(): Promise<RendimientoTecnico[]> {
  const supabase = createAdminClient()

  const [asigRes, calRes] = await Promise.all([
    supabase
      .from('asignaciones_tecnico')
      .select(`
        id_asignacion,
        id_tecnico,
        estado_asignacion,
        fecha_asignacion,
        fecha_aceptacion,
        tecnicos (
          id_tecnico,
          nombre,
          apellido,
          especialidad
        )
      `),
    supabase
      .from('calificaciones')
      .select('id_tecnico, puntuacion'),
  ])

  const asignaciones = (asigRes.data || []) as any[]
  const calificaciones = (calRes.data || []) as any[]

  // Agrupar por técnico
  const map: Record<number, RendimientoTecnico> = {}

  for (const asig of asignaciones) {
    const tec = Array.isArray(asig.tecnicos) ? asig.tecnicos[0] : asig.tecnicos
    if (!tec) continue
    const id = tec.id_tecnico
    if (!map[id]) {
      map[id] = {
        id_tecnico: id,
        nombre: tec.nombre,
        apellido: tec.apellido,
        especialidad: tec.especialidad,
        totalAsignaciones: 0,
        aceptadas: 0,
        rechazadas: 0,
        completadas: 0,
        tasaAceptacion: 0,
        tiempoPromedioAceptacionHs: null,
        calificacionPromedio: null,
        cantCalificaciones: 0,
      }
    }
    const r = map[id]
    r.totalAsignaciones++
    if (asig.estado_asignacion === 'aceptada' || asig.estado_asignacion === 'en_curso' || asig.estado_asignacion === 'completada') r.aceptadas++
    if (asig.estado_asignacion === 'rechazada') r.rechazadas++
    if (asig.estado_asignacion === 'completada') r.completadas++
  }

  // Calcular tiempo promedio de aceptación
  type AsigRow = { id_tecnico: number; estado_asignacion: string; fecha_asignacion: string; fecha_aceptacion: string | null }
  const tiemposMap: Record<number, number[]> = {}
  for (const asig of asignaciones as AsigRow[]) {
    if (asig.fecha_aceptacion && asig.fecha_asignacion) {
      const hs = (new Date(asig.fecha_aceptacion).getTime() - new Date(asig.fecha_asignacion).getTime()) / 3600000
      if (!tiemposMap[asig.id_tecnico]) tiemposMap[asig.id_tecnico] = []
      tiemposMap[asig.id_tecnico].push(hs)
    }
  }
  for (const [id, tiempos] of Object.entries(tiemposMap)) {
    if (map[Number(id)]) {
      map[Number(id)].tiempoPromedioAceptacionHs = Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10
    }
  }

  // Calificaciones
  type CalRow = { id_tecnico: number; puntuacion: number }
  const calMap: Record<number, number[]> = {}
  for (const c of calificaciones as CalRow[]) {
    if (!calMap[c.id_tecnico]) calMap[c.id_tecnico] = []
    calMap[c.id_tecnico].push(c.puntuacion)
  }
  for (const [id, punts] of Object.entries(calMap)) {
    if (map[Number(id)]) {
      map[Number(id)].calificacionPromedio = Math.round((punts.reduce((a, b) => a + b, 0) / punts.length) * 10) / 10
      map[Number(id)].cantCalificaciones = punts.length
    }
  }

  // Calcular tasa de aceptación
  for (const r of Object.values(map)) {
    r.tasaAceptacion = r.totalAsignaciones > 0 ? Math.round((r.aceptadas / r.totalAsignaciones) * 100) : 0
  }

  return Object.values(map).sort((a, b) => b.completadas - a.completadas)
}

// ─── 2. Embudo de Conversión ──────────────────────────────────────────────────

export interface EtapaEmbudo {
  etapa: string
  cantidad: number
  porcentaje: number
}

export async function getEmbudoConversion(): Promise<EtapaEmbudo[]> {
  const supabase = createAdminClient()

  const [incRes, asigRes, presRes] = await Promise.all([
    supabase.from('incidentes').select('id_incidente, estado_actual, fue_resuelto'),
    supabase.from('asignaciones_tecnico').select('id_incidente, estado_asignacion').in('estado_asignacion', ['aceptada', 'en_curso', 'completada']),
    supabase.from('presupuestos').select('id_incidente, estado_presupuesto'),
  ])

  const incidentes = incRes.data || []
  const asignacionesAceptadas = new Set((asigRes.data || []).map((a: any) => a.id_incidente))
  const presupuestosAprobados = new Set(
    (presRes.data || []).filter((p: any) => p.estado_presupuesto === 'aprobado').map((p: any) => p.id_incidente)
  )
  const presupuestosConPres = new Set((presRes.data || []).map((p: any) => p.id_incidente))

  const total = incidentes.length
  const conAsignacion = incidentes.filter((i: any) => asignacionesAceptadas.has(i.id_incidente)).length
  const conPresupuesto = incidentes.filter((i: any) => presupuestosConPres.has(i.id_incidente)).length
  const conPresAprobado = incidentes.filter((i: any) => presupuestosAprobados.has(i.id_incidente)).length
  const resueltos = incidentes.filter((i: any) => i.fue_resuelto).length

  const etapas = [
    { etapa: 'Creados', cantidad: total },
    { etapa: 'Con técnico asignado', cantidad: conAsignacion },
    { etapa: 'Con presupuesto', cantidad: conPresupuesto },
    { etapa: 'Presupuesto aprobado', cantidad: conPresAprobado },
    { etapa: 'Resueltos', cantidad: resueltos },
  ]

  return etapas.map(e => ({
    ...e,
    porcentaje: total > 0 ? Math.round((e.cantidad / total) * 100) : 0,
  }))
}

// ─── 3. Aging de Incidentes ───────────────────────────────────────────────────

export interface IncidenteAging {
  id_incidente: number
  descripcion_problema: string
  estado_actual: string
  nivel_prioridad: string | null
  diasDesdeCreacion: number
  tieneTecnico: boolean
  clienteNombre: string
}

export async function getAgingIncidentes(): Promise<IncidenteAging[]> {
  const supabase = createAdminClient()

  const [incRes, asigRes] = await Promise.all([
    supabase
      .from('incidentes')
      .select(`
        id_incidente,
        descripcion_problema,
        estado_actual,
        nivel_prioridad,
        fecha_registro,
        clientes:id_cliente_reporta (nombre, apellido)
      `)
      .in('estado_actual', ['pendiente', 'en_proceso'])
      .order('fecha_registro', { ascending: true }),
    supabase
      .from('asignaciones_tecnico')
      .select('id_incidente')
      .in('estado_asignacion', ['pendiente', 'aceptada', 'en_curso']),
  ])

  const asigSet = new Set((asigRes.data || []).map((a: any) => a.id_incidente))
  const ahora = new Date()

  return (incRes.data || []).map((i: any) => {
    const cliente = Array.isArray(i.clientes) ? i.clientes[0] : i.clientes
    return {
      id_incidente: i.id_incidente,
      descripcion_problema: i.descripcion_problema,
      estado_actual: i.estado_actual,
      nivel_prioridad: i.nivel_prioridad,
      diasDesdeCreacion: Math.floor((ahora.getTime() - new Date(i.fecha_registro).getTime()) / 86400000),
      tieneTecnico: asigSet.has(i.id_incidente),
      clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Sin cliente',
    }
  })
}

// ─── 4. Estado Financiero ─────────────────────────────────────────────────────

export interface EstadoFinanciero {
  totalPresupuestado: number
  totalCobrado: number
  saldoPendiente: number
  cantidadPresupuestosAprobados: number
  cantidadIncidentesConPago: number
  distribucionPagos: { tipo: string; monto: number; cantidad: number }[]
}

export async function getEstadoFinanciero(): Promise<EstadoFinanciero> {
  const supabase = createAdminClient()

  const [presRes, pagosRes] = await Promise.all([
    supabase
      .from('presupuestos')
      .select('costo_total, estado_presupuesto')
      .eq('estado_presupuesto', 'aprobado'),
    supabase
      .from('pagos')
      .select('tipo_pago, monto, id_incidente'),
  ])

  const presupuestos = presRes.data || []
  const pagos = (pagosRes.data || []) as any[]

  const totalPresupuestado = presupuestos.reduce((acc: number, p: any) => acc + (p.costo_total || 0), 0)
  const totalCobrado = pagos.reduce((acc, p) => acc + (p.monto || 0), 0)

  const distMap: Record<string, { monto: number; cantidad: number }> = {}
  for (const p of pagos) {
    const tipo = p.tipo_pago || 'otro'
    if (!distMap[tipo]) distMap[tipo] = { monto: 0, cantidad: 0 }
    distMap[tipo].monto += p.monto || 0
    distMap[tipo].cantidad++
  }

  return {
    totalPresupuestado,
    totalCobrado,
    saldoPendiente: Math.max(0, totalPresupuestado - totalCobrado),
    cantidadPresupuestosAprobados: presupuestos.length,
    cantidadIncidentesConPago: new Set(pagos.map(p => p.id_incidente)).size,
    distribucionPagos: Object.entries(distMap).map(([tipo, v]) => ({ tipo, ...v })),
  }
}

// ─── 5. Presupuestos por Estado ───────────────────────────────────────────────

export interface PresupuestoPorEstado {
  estado: string
  cantidad: number
  montoTotal: number
}

export async function getPresupuestosPorEstado(): Promise<PresupuestoPorEstado[]> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('presupuestos')
    .select('estado_presupuesto, costo_total')

  const map: Record<string, { cantidad: number; monto: number }> = {}
  for (const p of (data || []) as any[]) {
    const e = p.estado_presupuesto || 'sin_estado'
    if (!map[e]) map[e] = { cantidad: 0, monto: 0 }
    map[e].cantidad++
    map[e].monto += p.costo_total || 0
  }

  const ORDER = ['borrador', 'enviado', 'aprobado_admin', 'aprobado', 'rechazado', 'vencido']
  return ORDER.filter(e => map[e]).map(e => ({
    estado: e,
    cantidad: map[e].cantidad,
    montoTotal: map[e].monto,
  }))
}

// ─── 6. Mapa de Calor por Tipo de Inmueble ────────────────────────────────────

export interface CalorInmueble {
  tipoInmueble: string
  totalIncidentes: number
  resueltos: number
  enProceso: number
  pendientes: number
}

export async function getIncidentesPorTipoInmueble(): Promise<CalorInmueble[]> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('incidentes')
    .select(`
      estado_actual,
      fue_resuelto,
      inmuebles:id_propiedad (
        tipos_inmuebles (nombre)
      )
    `)

  const map: Record<string, { total: number; resueltos: number; enProceso: number; pendientes: number }> = {}

  for (const inc of (data || []) as any[]) {
    const inm = Array.isArray(inc.inmuebles) ? inc.inmuebles[0] : inc.inmuebles
    const tipo = inm?.tipos_inmuebles?.nombre || 'Sin tipo'
    if (!map[tipo]) map[tipo] = { total: 0, resueltos: 0, enProceso: 0, pendientes: 0 }
    map[tipo].total++
    if (inc.fue_resuelto) map[tipo].resueltos++
    else if (inc.estado_actual === 'en_proceso') map[tipo].enProceso++
    else map[tipo].pendientes++
  }

  return Object.entries(map)
    .map(([tipoInmueble, v]) => ({ tipoInmueble, totalIncidentes: v.total, ...v }))
    .sort((a, b) => b.totalIncidentes - a.totalIncidentes)
}

// ─── 7. Satisfacción del Cliente ─────────────────────────────────────────────

export interface SatisfaccionCliente {
  promedioGeneral: number
  cantidadCalificaciones: number
  distribucion: { estrellas: number; cantidad: number }[]
  tasaResolucionProblema: number   // % resolvio_problema === 1
  tasaConformidadFirmada: number   // % conformidades firmadas
}

export async function getSatisfaccionCliente(): Promise<SatisfaccionCliente> {
  const supabase = createAdminClient()

  const [calRes, confRes] = await Promise.all([
    supabase.from('calificaciones').select('puntuacion, resolvio_problema'),
    supabase.from('conformidades').select('esta_firmada'),
  ])

  const cals = (calRes.data || []) as any[]
  const confs = (confRes.data || []) as any[]

  const distMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sumaTotal = 0
  let resolvioCount = 0

  for (const c of cals) {
    const p = Math.round(c.puntuacion)
    if (p >= 1 && p <= 5) {
      distMap[p] = (distMap[p] || 0) + 1
      sumaTotal += c.puntuacion
    }
    if (c.resolvio_problema === 1) resolvioCount++
  }

  const firmadas = confs.filter((c) => c.esta_firmada).length

  return {
    promedioGeneral: cals.length > 0 ? Math.round((sumaTotal / cals.length) * 10) / 10 : 0,
    cantidadCalificaciones: cals.length,
    distribucion: [5, 4, 3, 2, 1].map(e => ({ estrellas: e, cantidad: distMap[e] || 0 })),
    tasaResolucionProblema: cals.length > 0 ? Math.round((resolvioCount / cals.length) * 100) : 0,
    tasaConformidadFirmada: confs.length > 0 ? Math.round((firmadas / confs.length) * 100) : 0,
  }
}

// ─── 8. KPIs Administrativos ──────────────────────────────────────────────────

export interface KpisAdmin {
  incidentesPorMesUltimos3: { mes: string; total: number }[]
  presupuestosPendientesRevision: number
  tiempoPromedioAsignacionDias: number
  incidentesActivos: number
  racioResolucion: number  // resueltos / total
}

export async function getKpisAdministrativos(): Promise<KpisAdmin> {
  const supabase = createAdminClient()

  const [incRes, presEnviadosRes, asigRes] = await Promise.all([
    supabase.from('incidentes').select('id_incidente, estado_actual, fue_resuelto, fecha_registro'),
    supabase.from('presupuestos').select('id_presupuesto', { count: 'exact', head: true }).eq('estado_presupuesto', 'enviado'),
    supabase.from('asignaciones_tecnico').select('fecha_asignacion, fecha_aceptacion').not('fecha_aceptacion', 'is', null),
  ])

  const incidentes = (incRes.data || []) as any[]
  const ahora = new Date()

  // Últimos 3 meses
  const porMes = Array.from({ length: 3 }, (_, i) => {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - (2 - i), 1)
    const nombre = fecha.toLocaleString('es-AR', { month: 'short', year: '2-digit' })
    const total = incidentes.filter(inc => {
      const f = new Date(inc.fecha_registro)
      return f.getFullYear() === fecha.getFullYear() && f.getMonth() === fecha.getMonth()
    }).length
    return { mes: nombre, total }
  })

  // Tiempo promedio desde asignación hasta aceptación (en días)
  const asigs = (asigRes.data || []) as any[]
  const tiempoPromedio = asigs.length > 0
    ? Math.round(
        asigs.reduce((acc, a) => {
          const dias = (new Date(a.fecha_aceptacion).getTime() - new Date(a.fecha_asignacion).getTime()) / 86400000
          return acc + dias
        }, 0) / asigs.length * 10
      ) / 10
    : 0

  const activos = incidentes.filter(i => !i.fue_resuelto).length
  const resueltos = incidentes.filter(i => i.fue_resuelto).length

  return {
    incidentesPorMesUltimos3: porMes,
    presupuestosPendientesRevision: presEnviadosRes.count || 0,
    tiempoPromedioAsignacionDias: tiempoPromedio,
    incidentesActivos: activos,
    racioResolucion: incidentes.length > 0 ? Math.round((resueltos / incidentes.length) * 100) : 0,
  }
}

// ─── 9. Tiempo de Resolución por Categoría ───────────────────────────────────

export interface TiempoResolucionCategoria {
  categoria: string
  cantidadResueltos: number
  diasPromedio: number
  diasMinimo: number
  diasMaximo: number
}

export async function getTiempoResolucionPorCategoria(): Promise<TiempoResolucionCategoria[]> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('incidentes')
    .select('categoria, fecha_registro, fecha_cierre, fue_resuelto')
    .not('fecha_cierre', 'is', null)

  const resueltos = (data || []).filter((i: any) => i.fue_resuelto && i.fecha_cierre && i.fecha_registro)

  const map: Record<string, number[]> = {}
  for (const inc of resueltos as any[]) {
    const cat = inc.categoria || 'Sin categoría'
    const dias = Math.max(0, Math.round(
      (new Date(inc.fecha_cierre).getTime() - new Date(inc.fecha_registro).getTime()) / 86400000
    ))
    if (!map[cat]) map[cat] = []
    map[cat].push(dias)
  }

  return Object.entries(map)
    .map(([categoria, dias]) => ({
      categoria,
      cantidadResueltos: dias.length,
      diasPromedio: Math.round(dias.reduce((a, b) => a + b, 0) / dias.length),
      diasMinimo: Math.min(...dias),
      diasMaximo: Math.max(...dias),
    }))
    .sort((a, b) => b.diasPromedio - a.diasPromedio)
}

// ─── 10. Reincidencia por Propiedad ──────────────────────────────────────────

export interface ReincidenciaPropiedad {
  id_propiedad: number
  direccion: string
  totalIncidentes: number
  categoriaMasFrecuente: string | null
  cantCategoriaMasFrecuente: number
}

export async function getReincidenciaPorPropiedad(): Promise<ReincidenciaPropiedad[]> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('incidentes')
    .select(`
      id_propiedad,
      categoria,
      inmuebles:id_propiedad (calle, altura, barrio)
    `)
    .not('id_propiedad', 'is', null)

  const map: Record<number, { direccion: string; categorias: string[] }> = {}

  for (const inc of (data || []) as any[]) {
    const id = inc.id_propiedad
    if (!map[id]) {
      const inm = Array.isArray(inc.inmuebles) ? inc.inmuebles[0] : inc.inmuebles
      const dir = inm
        ? [inm.calle, inm.altura, inm.barrio].filter(Boolean).join(' ')
        : `Propiedad #${id}`
      map[id] = { direccion: dir || `Propiedad #${id}`, categorias: [] }
    }
    if (inc.categoria) map[id].categorias.push(inc.categoria)
  }

  return Object.entries(map)
    .filter(([, v]) => v.categorias.length >= 2)
    .map(([id, v]) => {
      const freq: Record<string, number> = {}
      for (const c of v.categorias) freq[c] = (freq[c] || 0) + 1
      const [catMasFrecuente, cantCat] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
      return {
        id_propiedad: Number(id),
        direccion: v.direccion,
        totalIncidentes: v.categorias.length,
        categoriaMasFrecuente: catMasFrecuente,
        cantCategoriaMasFrecuente: cantCat,
      }
    })
    .sort((a, b) => b.totalIncidentes - a.totalIncidentes)
    .slice(0, 10)
}

// ─── 11. Rentabilidad por Técnico ─────────────────────────────────────────────

export interface RentabilidadTecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  totalCobradoCliente: number
  totalPagadoTecnico: number
  margen: number
  cantidadTrabajos: number
}

export async function getRentabilidadTecnicos(): Promise<RentabilidadTecnico[]> {
  const supabase = createAdminClient()

  const [asigRes, cobrosRes, pagosRes, tecRes] = await Promise.all([
    supabase
      .from('asignaciones_tecnico')
      .select('id_tecnico, id_incidente')
      .in('estado_asignacion', ['completada', 'en_curso', 'aceptada']),
    supabase
      .from('cobros_clientes')
      .select('id_incidente, monto_cobro'),
    supabase
      .from('pagos_tecnicos')
      .select('id_incidente, monto_pago'),
    supabase
      .from('tecnicos')
      .select('id_tecnico, nombre, apellido'),
  ])

  const tecMap = new Map<number, { nombre: string; apellido: string }>(
    (tecRes.data || []).map((t: any) => [t.id_tecnico, { nombre: t.nombre, apellido: t.apellido }])
  )

  // Mapa incidente → tecnico (tomar primera asignación completada)
  const incToTec = new Map<number, number>()
  for (const a of (asigRes.data || []) as any[]) {
    if (!incToTec.has(a.id_incidente)) incToTec.set(a.id_incidente, a.id_tecnico)
  }

  const cobros = new Map<number, number>()
  for (const c of (cobrosRes.data || []) as any[]) {
    cobros.set(c.id_incidente, (cobros.get(c.id_incidente) || 0) + (c.monto_cobro || 0))
  }
  const pagos = new Map<number, number>()
  for (const p of (pagosRes.data || []) as any[]) {
    pagos.set(p.id_incidente, (pagos.get(p.id_incidente) || 0) + (p.monto_pago || 0))
  }

  const result: Record<number, RentabilidadTecnico> = {}

  for (const [idInc, idTec] of incToTec.entries()) {
    const tec = tecMap.get(idTec)
    if (!tec) continue
    if (!result[idTec]) {
      result[idTec] = {
        id_tecnico: idTec,
        nombre: tec.nombre,
        apellido: tec.apellido,
        totalCobradoCliente: 0,
        totalPagadoTecnico: 0,
        margen: 0,
        cantidadTrabajos: 0,
      }
    }
    result[idTec].totalCobradoCliente += cobros.get(idInc) || 0
    result[idTec].totalPagadoTecnico += pagos.get(idInc) || 0
    result[idTec].cantidadTrabajos++
  }

  for (const r of Object.values(result)) {
    r.margen = r.totalCobradoCliente - r.totalPagadoTecnico
  }

  return Object.values(result).sort((a, b) => b.totalCobradoCliente - a.totalCobradoCliente)
}

// ─── Carga conjunta ───────────────────────────────────────────────────────────

export async function getReportesCompletos() {
  const [
    rendimientoTecnicos,
    embudoConversion,
    agingIncidentes,
    estadoFinanciero,
    presupuestosPorEstado,
    incidentesPorTipoInmueble,
    satisfaccionCliente,
    kpisAdministrativos,
    tiempoResolucionPorCategoria,
    reincidenciaPorPropiedad,
    rentabilidadTecnicos,
  ] = await Promise.all([
    getRendimientoTecnicos(),
    getEmbudoConversion(),
    getAgingIncidentes(),
    getEstadoFinanciero(),
    getPresupuestosPorEstado(),
    getIncidentesPorTipoInmueble(),
    getSatisfaccionCliente(),
    getKpisAdministrativos(),
    getTiempoResolucionPorCategoria(),
    getReincidenciaPorPropiedad(),
    getRentabilidadTecnicos(),
  ])

  return {
    rendimientoTecnicos,
    embudoConversion,
    agingIncidentes,
    estadoFinanciero,
    presupuestosPorEstado,
    incidentesPorTipoInmueble,
    satisfaccionCliente,
    kpisAdministrativos,
    tiempoResolucionPorCategoria,
    reincidenciaPorPropiedad,
    rentabilidadTecnicos,
  }
}

export type ReportesData = Awaited<ReturnType<typeof getReportesCompletos>>
