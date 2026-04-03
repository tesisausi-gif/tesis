'use server'

/**
 * Servicio de Exportación de Reportes
 * Incluye funciones legacy + 12 reportes analíticos con agregación en TypeScript
 */

import { createAdminClient } from '@/shared/lib/supabase/admin'
import type {
  FilaIncidenteExport,
  FilaPagoExport,
  FilaTecnicoExport,
  TecnicoSelect,
  InmuebleSelect,
  R1Resultado,
  R2Resultado,
  R3Resultado,
  R4Resultado,
  R5Resultado,
  R6Resultado,
  R7Resultado,
  R8Resultado,
  R10Resultado,
  R11Resultado,
  R12Resultado,
  R13Resultado,
} from './exportar.types'

interface FiltroFechas {
  fechaDesde?: string | null
  fechaHasta?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diasEntre(desde: string, hasta?: string | null): number {
  const d1 = new Date(desde)
  const d2 = hasta ? new Date(hasta) : new Date()
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
}

function modoFrecuente(arr: string[]): string {
  if (!arr.length) return ''
  const counts: Record<string, number> = {}
  for (const v of arr) counts[v] = (counts[v] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

// ─── Legacy: 3 exportaciones básicas ─────────────────────────────────────────

export async function getIncidentesParaExportar(filtro?: FiltroFechas): Promise<FilaIncidenteExport[]> {
  const { createAdminClient: admin } = await import('@/shared/lib/supabase/admin')
  const supabase = admin()

  let query = supabase
    .from('incidentes')
    .select(`
      id_incidente,
      fecha_registro,
      descripcion_problema,
      categoria,
      nivel_prioridad,
      estado_actual,
      fue_resuelto,
      fecha_cierre,
      clientes:id_cliente_reporta (nombre, apellido),
      inmuebles:id_propiedad (calle, localidad)
    `)
    .order('fecha_registro', { ascending: false })

  if (filtro?.fechaDesde) query = query.gte('fecha_registro', filtro.fechaDesde)
  if (filtro?.fechaHasta) query = query.lte('fecha_registro', filtro.fechaHasta)

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((row: any) => ({
    id_incidente: row.id_incidente,
    fecha_registro: row.fecha_registro ?? '',
    descripcion_problema: row.descripcion_problema ?? '',
    categoria: row.categoria ?? '',
    nivel_prioridad: row.nivel_prioridad ?? '',
    estado_actual: row.estado_actual ?? '',
    fue_resuelto: row.fue_resuelto ?? false,
    fecha_cierre: row.fecha_cierre ?? '',
    cliente_nombre: row.clientes?.nombre ?? '',
    cliente_apellido: row.clientes?.apellido ?? '',
    inmueble_calle: row.inmuebles?.calle ?? '',
    inmueble_localidad: row.inmuebles?.localidad ?? '',
  }))
}

export async function getPagosParaExportar(filtro?: FiltroFechas): Promise<FilaPagoExport[]> {
  const { createAdminClient: admin } = await import('@/shared/lib/supabase/admin')
  const supabase = admin()

  let query = supabase
    .from('pagos')
    .select(`
      id_pago,
      fecha_pago,
      monto_pagado,
      tipo_pago,
      metodo_pago,
      numero_comprobante,
      incidentes (id_incidente, descripcion_problema)
    `)
    .order('fecha_pago', { ascending: false })

  if (filtro?.fechaDesde) query = query.gte('fecha_pago', filtro.fechaDesde)
  if (filtro?.fechaHasta) query = query.lte('fecha_pago', filtro.fechaHasta)

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((row: any) => ({
    id_pago: row.id_pago,
    fecha_pago: row.fecha_pago ?? '',
    monto_pagado: row.monto_pagado ?? 0,
    tipo_pago: row.tipo_pago ?? '',
    metodo_pago: row.metodo_pago ?? '',
    numero_comprobante: row.numero_comprobante ?? '',
    incidente_id: row.incidentes?.id_incidente ?? 0,
    incidente_descripcion: row.incidentes?.descripcion_problema ?? '',
    cliente_nombre: '',
    cliente_apellido: '',
  }))
}

export async function getTecnicosParaExportar(): Promise<FilaTecnicoExport[]> {
  const { createAdminClient: admin } = await import('@/shared/lib/supabase/admin')
  const supabase = admin()

  const [tecnicosRes, asignacionesRes] = await Promise.all([
    supabase
      .from('tecnicos')
      .select('id_tecnico, nombre, apellido, especialidad, correo_electronico, telefono')
      .eq('esta_activo', true),
    supabase
      .from('asignaciones_tecnico')
      .select('id_tecnico, estado_asignacion'),
  ])

  const tecnicos = tecnicosRes.data || []
  const asignaciones = asignacionesRes.data || []

  return tecnicos.map((tec: any) => {
    const propias = asignaciones.filter((a: any) => a.id_tecnico === tec.id_tecnico)
    return {
      nombre: tec.nombre ?? '',
      apellido: tec.apellido ?? '',
      especialidad: tec.especialidad ?? '',
      email: tec.correo_electronico ?? '',
      telefono: tec.telefono ?? '',
      total_asignaciones: propias.length,
      asignaciones_completadas: propias.filter((a: any) => a.estado_asignacion === 'completada').length,
    }
  })
}

// ─── Selects dinámicos ────────────────────────────────────────────────────────

export async function getTecnicosSelect(): Promise<TecnicoSelect[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tecnicos')
    .select('id_tecnico, nombre, apellido')
    .eq('esta_activo', true)
    .order('nombre')
  if (error) throw error
  return (data || []) as TecnicoSelect[]
}

export async function getInmueblesSelect(): Promise<InmuebleSelect[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('inmuebles')
    .select('id_inmueble, calle, localidad')
    .order('calle')
  if (error) throw error
  return (data || []) as InmuebleSelect[]
}

// ─── R1: Incidentes por Tipo y Estado ────────────────────────────────────────

export async function getR1IncidentesPorTipoEstado(filtros: {
  fechaDesde?: string
  fechaHasta?: string
  categoria?: string
  estadoActual?: string
}): Promise<R1Resultado> {
  const supabase = createAdminClient()

  let query = supabase
    .from('incidentes')
    .select(`
      id_incidente,
      descripcion_problema,
      categoria,
      estado_actual,
      fecha_registro,
      fecha_cierre,
      clientes:id_cliente_reporta (nombre, apellido),
      inmuebles:id_propiedad (calle, altura, barrio, localidad),
      presupuestos (id_presupuesto, estado_presupuesto),
      conformidades (id_conformidad, url_documento, esta_firmada, esta_rechazada)
    `)
    .order('fecha_registro', { ascending: false })

  if (filtros.fechaDesde) query = query.gte('fecha_registro', filtros.fechaDesde)
  if (filtros.fechaHasta) query = query.lte('fecha_registro', filtros.fechaHasta)
  if (filtros.categoria) query = query.eq('categoria', filtros.categoria)
  if (filtros.estadoActual) query = query.eq('estado_actual', filtros.estadoActual)

  const { data, error } = await query
  if (error) throw error

  const items = (data || []) as any[]
  const total = items.length

  const toResumen = (row: any) => ({
    id_incidente: row.id_incidente,
    descripcion: row.descripcion_problema || '',
    categoria: row.categoria || 'Sin categoría',
    cliente: row.clientes ? `${row.clientes.nombre} ${row.clientes.apellido}` : '',
    inmueble: row.inmuebles
      ? [row.inmuebles.calle, row.inmuebles.altura, row.inmuebles.barrio, row.inmuebles.localidad].filter(Boolean).join(' ')
      : '',
    fecha_registro: row.fecha_registro || '',
  })

  const categoriasMap: Record<string, number> = {}
  const estadosMap: Record<string, number> = {}

  for (const inc of items) {
    const cat = inc.categoria || 'Sin categoría'
    categoriasMap[cat] = (categoriasMap[cat] || 0) + 1
    const est = inc.estado_actual || 'Sin estado'
    estadosMap[est] = (estadosMap[est] || 0) + 1
  }

  const cerrados = (estadosMap['finalizado'] || 0) + (estadosMap['resuelto'] || 0)
  const enCurso = estadosMap['en_proceso'] || 0
  const pendientesCount = estadosMap['pendiente'] || 0

  let diasPeriodo = 1
  if (filtros.fechaDesde && filtros.fechaHasta) {
    diasPeriodo = Math.max(1, diasEntre(filtros.fechaDesde, filtros.fechaHasta))
  }

  // Agrupar por etapas del proceso
  const pendienteItems = items.filter(i => i.estado_actual === 'pendiente')
  const asigSolItems = items.filter(i => i.estado_actual === 'asignacion_solicitada')
  const enProcesoItems = items.filter(i => i.estado_actual === 'en_proceso')
  const finalizadoItems = items.filter(i => i.estado_actual === 'finalizado' || i.estado_actual === 'resuelto')

  const conPresupuestoPendiente = enProcesoItems.filter(i =>
    i.presupuestos?.some((p: any) => p.estado_presupuesto === 'enviado')
  )
  const conConformidadPendiente = enProcesoItems.filter(i =>
    i.conformidades?.some((c: any) => c.url_documento && !c.esta_firmada && !c.esta_rechazada) &&
    !i.presupuestos?.some((p: any) => p.estado_presupuesto === 'enviado')
  )

  const porCategoriaItems = Object.entries(categoriasMap).sort((a, b) => b[1] - a[1])
    .map(([categoria, cantidad]) => ({
      categoria,
      cantidad,
      porcentaje: total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0,
    }))
  if (porCategoriaItems.length > 0 && total > 0) {
    const sumaParcial = porCategoriaItems.slice(0, -1).reduce((s, i) => s + i.porcentaje, 0)
    porCategoriaItems[porCategoriaItems.length - 1].porcentaje = Math.round((100 - sumaParcial) * 10) / 10
  }

  return {
    total,
    porcentajeCerrados: total > 0 ? (cerrados / total) * 100 : 0,
    porcentajeEnCurso: total > 0 ? (enCurso / total) * 100 : 0,
    porcentajePendientes: total > 0 ? (pendientesCount / total) * 100 : 0,
    promedioDiario: total / diasPeriodo,
    porCategoria: porCategoriaItems,
    porEstado: Object.entries(estadosMap)
      .sort((a, b) => b[1] - a[1])
      .map(([estado, cantidad]) => ({
        estado,
        cantidad,
        porcentaje: total > 0 ? (cantidad / total) * 100 : 0,
      })),
    etapas: {
      pendiente: { cantidad: pendienteItems.length, incidentes: pendienteItems.map(toResumen) },
      asignacion_solicitada: { cantidad: asigSolItems.length, incidentes: asigSolItems.map(toResumen) },
      en_proceso: { cantidad: enProcesoItems.length, incidentes: enProcesoItems.map(toResumen) },
      con_presupuesto_pendiente: { cantidad: conPresupuestoPendiente.length, incidentes: conPresupuestoPendiente.map(toResumen) },
      con_conformidad_pendiente: { cantidad: conConformidadPendiente.length, incidentes: conConformidadPendiente.map(toResumen) },
      finalizado: { cantidad: finalizadoItems.length, incidentes: finalizadoItems.map(toResumen) },
    },
  }
}

// ─── R2: Tiempos de Resolución ────────────────────────────────────────────────

export async function getR2TiemposResolucion(filtros: {
  fechaDesde?: string
  fechaHasta?: string
  categoria?: string
  ordenarPor?: 'mayor' | 'menor' | 'reciente'
}): Promise<R2Resultado> {
  const supabase = createAdminClient()

  let query = supabase
    .from('incidentes')
    .select(`
      id_incidente,
      categoria,
      descripcion_problema,
      fecha_registro,
      fecha_cierre,
      inmuebles:id_propiedad (calle, localidad)
    `)

  if (filtros.fechaDesde) query = query.gte('fecha_registro', filtros.fechaDesde)
  if (filtros.fechaHasta) query = query.lte('fecha_registro', filtros.fechaHasta)
  if (filtros.categoria) query = query.eq('categoria', filtros.categoria)

  const { data, error } = await query
  if (error) throw error

  const items = (data || []).map((row: any) => {
    const dias = diasEntre(row.fecha_registro, row.fecha_cierre)
    return {
      id_incidente: row.id_incidente,
      categoria: row.categoria || '',
      descripcion: row.descripcion_problema || '',
      inmueble: row.inmuebles ? `${row.inmuebles.calle || ''} ${row.inmuebles.localidad || ''}`.trim() : '',
      fecha_registro: row.fecha_registro || '',
      fecha_cierre: row.fecha_cierre || null,
      dias,
    }
  })

  if (!items.length) {
    return { promedioDias: 0, minDias: 0, maxDias: 0, totalIncidentes: 0, incidentesMasLentos: [] }
  }

  const dias = items.map(i => i.dias)
  const promedioDias = dias.reduce((a, b) => a + b, 0) / dias.length
  const minDias = Math.min(...dias)
  const maxDias = Math.max(...dias)

  let sorted = [...items]
  if (filtros.ordenarPor === 'menor') sorted.sort((a, b) => a.dias - b.dias)
  else if (filtros.ordenarPor === 'reciente') sorted.sort((a, b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime())
  else sorted.sort((a, b) => b.dias - a.dias) // mayor por defecto

  return {
    promedioDias,
    minDias,
    maxDias,
    totalIncidentes: items.length,
    incidentesMasLentos: sorted.slice(0, 20),
  }
}

// ─── R3: Técnicos por Volumen ─────────────────────────────────────────────────

export async function getR3TecnicosPorVolumen(filtros: {
  fechaDesde?: string
  fechaHasta?: string
  idTecnico?: number
}): Promise<R3Resultado> {
  const supabase = createAdminClient()

  const [asignacionesRes, tecnicosRes] = await Promise.all([
    (() => {
      let q = supabase
        .from('asignaciones_tecnico')
        .select(`
          id_asignacion,
          id_incidente,
          id_tecnico,
          estado_asignacion,
          fecha_asignacion,
          incidentes (fecha_registro, fecha_cierre, estado_actual)
        `)
      if (filtros.fechaDesde) q = q.gte('fecha_asignacion', filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte('fecha_asignacion', filtros.fechaHasta)
      if (filtros.idTecnico) q = q.eq('id_tecnico', filtros.idTecnico)
      return q
    })(),
    (() => {
      let q = supabase
        .from('tecnicos')
        .select('id_tecnico, nombre, apellido, especialidad')
        .eq('esta_activo', true)
      if (filtros.idTecnico) q = q.eq('id_tecnico', filtros.idTecnico)
      return q
    })(),
  ])

  if (asignacionesRes.error) throw asignacionesRes.error
  if (tecnicosRes.error) throw tecnicosRes.error

  const asignaciones = asignacionesRes.data || []
  const tecnicos = tecnicosRes.data || []

  const tecnicoMap: Record<number, any> = {}
  for (const t of tecnicos) {
    tecnicoMap[t.id_tecnico] = {
      id_tecnico: t.id_tecnico,
      nombre: t.nombre || '',
      apellido: t.apellido || '',
      especialidad: t.especialidad || '',
      asignados: 0,
      cerrados: 0,
      enCurso: 0,
      diasList: [] as number[],
    }
  }

  for (const a of asignaciones) {
    const entry = tecnicoMap[a.id_tecnico]
    if (!entry) continue
    entry.asignados++
    const inc = Array.isArray(a.incidentes) ? a.incidentes[0] : a.incidentes
    if (a.estado_asignacion === 'completada') {
      entry.cerrados++
      if (inc?.fecha_registro) {
        entry.diasList.push(diasEntre(inc.fecha_registro, inc.fecha_cierre))
      }
    } else if (['aceptada', 'en_curso', 'pendiente'].includes(a.estado_asignacion)) {
      entry.enCurso++
    }
  }

  const result = Object.values(tecnicoMap).map((t: any) => ({
    id_tecnico: t.id_tecnico,
    nombre: t.nombre,
    apellido: t.apellido,
    especialidad: t.especialidad,
    asignados: t.asignados,
    cerrados: t.cerrados,
    enCurso: t.enCurso,
    tasaCierre: t.asignados > 0 ? (t.cerrados / t.asignados) * 100 : 0,
    promedioDias: t.diasList.length > 0 ? t.diasList.reduce((a: number, b: number) => a + b, 0) / t.diasList.length : 0,
  })).sort((a, b) => b.cerrados - a.cerrados)

  const totalTecnicos = result.length
  const promedioAsignados = totalTecnicos > 0 ? result.reduce((s, t) => s + t.asignados, 0) / totalTecnicos : 0
  const promedioCerrados = totalTecnicos > 0 ? result.reduce((s, t) => s + t.cerrados, 0) / totalTecnicos : 0

  return { totalTecnicos, promedioAsignados, promedioCerrados, tecnicos: result }
}

// ─── R4: Propiedades con Más Incidentes ───────────────────────────────────────

export async function getR4PropiedadesMasIncidentes(filtros: {
  fechaDesde?: string
  fechaHasta?: string
  idInmueble?: number
  topN?: number
}): Promise<R4Resultado> {
  const supabase = createAdminClient()

  let incQuery = supabase
    .from('incidentes')
    .select(`
      id_incidente,
      id_propiedad,
      categoria,
      estado_actual,
      fecha_registro,
      inmuebles:id_propiedad (id_inmueble, calle, altura, barrio, localidad)
    `)

  if (filtros.fechaDesde) incQuery = incQuery.gte('fecha_registro', filtros.fechaDesde)
  if (filtros.fechaHasta) incQuery = incQuery.lte('fecha_registro', filtros.fechaHasta)
  if (filtros.idInmueble) incQuery = incQuery.eq('id_propiedad', filtros.idInmueble)

  const { data: incidentes, error: incError } = await incQuery
  if (incError) throw incError

  const incidenteIds = (incidentes || []).map((i: any) => i.id_incidente)
  let pagosData: any[] = []
  if (incidenteIds.length > 0) {
    const { data: pagos } = await supabase
      .from('pagos')
      .select('id_incidente, monto_pagado')
      .in('id_incidente', incidenteIds)
    pagosData = pagos || []
  }

  const pagosPorIncidente: Record<number, number> = {}
  for (const p of pagosData) {
    pagosPorIncidente[p.id_incidente] = (pagosPorIncidente[p.id_incidente] || 0) + (p.monto_pagado || 0)
  }

  const inmuebleMap: Record<number, any> = {}
  for (const inc of (incidentes || [])) {
    const inm = Array.isArray(inc.inmuebles) ? inc.inmuebles[0] : inc.inmuebles
    if (!inm) continue
    const id = inm.id_inmueble
    if (!inmuebleMap[id]) {
      inmuebleMap[id] = {
        id_inmueble: id,
        nombre: `${inm.calle || ''} ${inm.altura || ''}`.trim(),
        direccion: `${inm.calle || ''} ${inm.altura || ''}, ${inm.barrio || ''} ${inm.localidad || ''}`.trim(),
        incidentes: [],
        costoTotal: 0,
        incidentesAbiertos: 0,
      }
    }
    inmuebleMap[id].incidentes.push(inc.categoria || '')
    inmuebleMap[id].costoTotal += pagosPorIncidente[inc.id_incidente] || 0
    if (inc.estado_actual !== 'finalizado' && inc.estado_actual !== 'resuelto') inmuebleMap[id].incidentesAbiertos++
  }

  const topN = filtros.topN || 10
  const result = Object.values(inmuebleMap)
    .map((i: any) => ({
      id_inmueble: i.id_inmueble,
      nombre: i.nombre,
      direccion: i.direccion,
      totalIncidentes: i.incidentes.length,
      costoTotal: i.costoTotal,
      tipoFrecuente: modoFrecuente(i.incidentes),
      incidentesAbiertos: i.incidentesAbiertos,
    }))
    .sort((a, b) => b.totalIncidentes - a.totalIncidentes)
    .slice(0, topN)

  const totalIncidentes = result.reduce((s, i) => s + i.totalIncidentes, 0)
  const costoTotal = result.reduce((s, i) => s + i.costoTotal, 0)

  return {
    totalPropiedades: result.length,
    totalIncidentes,
    costoTotal,
    inmuebles: result,
  }
}

// ─── R5: Rentabilidad por Refacción ──────────────────────────────────────────

export async function getR5RentabilidadPorRefaccion(filtros: {
  fechaDesde?: string
  fechaHasta?: string
  categoria?: string
}): Promise<R5Resultado> {
  const supabase = createAdminClient()

  // Ingresos: cobros a clientes (incluyen comisión ISBA)
  let qCobros = supabase
    .from('cobros_clientes')
    .select('monto_cobro, fecha_cobro, id_incidente')
  if (filtros.fechaDesde) qCobros = qCobros.gte('fecha_cobro', filtros.fechaDesde)
  if (filtros.fechaHasta) qCobros = qCobros.lte('fecha_cobro', filtros.fechaHasta)

  // Costos: pagos a técnicos (materiales + mano de obra)
  let qPagos = supabase
    .from('pagos_tecnicos')
    .select('monto_pago, fecha_pago, id_incidente')
  if (filtros.fechaDesde) qPagos = qPagos.gte('fecha_pago', filtros.fechaDesde)
  if (filtros.fechaHasta) qPagos = qPagos.lte('fecha_pago', filtros.fechaHasta)

  const [cobrosRes, pagosRes] = await Promise.all([qCobros, qPagos])

  const cobros = cobrosRes.data || []
  const pagos = pagosRes.data || []

  // Fetch categories separately to avoid FK join issues
  const incIds = [...new Set([
    ...cobros.map((c: any) => c.id_incidente).filter(Boolean),
    ...pagos.map((p: any) => p.id_incidente).filter(Boolean),
  ])]
  let catPorIncidente: Record<number, string> = {}
  if (incIds.length > 0) {
    const { data: incs } = await supabase.from('incidentes').select('id_incidente, categoria').in('id_incidente', incIds)
    for (const inc of (incs || [])) {
      catPorIncidente[inc.id_incidente] = inc.categoria || 'Sin categoría'
    }
  }

  const tipoMap: Record<string, { ingreso: number; costo: number }> = {}

  for (const c of cobros) {
    const tipo = (c.id_incidente && catPorIncidente[c.id_incidente]) || 'Sin categoría'
    if (filtros.categoria && tipo !== filtros.categoria) continue
    if (!tipoMap[tipo]) tipoMap[tipo] = { ingreso: 0, costo: 0 }
    tipoMap[tipo].ingreso += Number(c.monto_cobro) || 0
  }

  for (const p of pagos) {
    const tipo = (p.id_incidente && catPorIncidente[p.id_incidente]) || 'Sin categoría'
    if (filtros.categoria && tipo !== filtros.categoria) continue
    if (!tipoMap[tipo]) tipoMap[tipo] = { ingreso: 0, costo: 0 }
    tipoMap[tipo].costo += Number(p.monto_pago) || 0
  }

  const porTipo = Object.entries(tipoMap)
    .map(([tipo, v]) => {
      const comision = v.ingreso - v.costo
      return {
        tipo,
        ingresoBruto: v.ingreso,
        costoPagadoTecnico: v.costo,
        comision,
        margen: v.ingreso > 0 ? (comision / v.ingreso) * 100 : 0,
      }
    })
    .sort((a, b) => b.ingresoBruto - a.ingresoBruto)

  const ingresoTotal = porTipo.reduce((s, t) => s + t.ingresoBruto, 0)
  const costoTotal = porTipo.reduce((s, t) => s + t.costoPagadoTecnico, 0)
  const comisionTotal = ingresoTotal - costoTotal

  return {
    ingresoTotal,
    costoTotal,
    comisionTotal,
    margenGlobal: ingresoTotal > 0 ? (comisionTotal / ingresoTotal) * 100 : 0,
    porTipo,
  }
}

// ─── R6: Desempeño de Técnicos ────────────────────────────────────────────────

export async function getR6DesempenoTecnicos(filtros: {
  fechaDesde?: string
  fechaHasta?: string
  idTecnico?: number
}): Promise<R6Resultado> {
  const supabase = createAdminClient()

  // Datos de técnicos base
  let tecnicosQuery = supabase.from('tecnicos').select('id_tecnico, nombre, apellido, especialidad').eq('esta_activo', true)
  if (filtros.idTecnico) tecnicosQuery = tecnicosQuery.eq('id_tecnico', filtros.idTecnico)

  // Asignaciones (todas las del período)
  let asigQuery = supabase
    .from('asignaciones_tecnico')
    .select('id_tecnico, id_incidente, estado_asignacion, fecha_asignacion, incidentes:id_incidente (fecha_registro)')
  if (filtros.fechaDesde) asigQuery = asigQuery.gte('fecha_asignacion', filtros.fechaDesde)
  if (filtros.fechaHasta) asigQuery = asigQuery.lte('fecha_asignacion', filtros.fechaHasta)
  if (filtros.idTecnico) asigQuery = asigQuery.eq('id_tecnico', filtros.idTecnico)

  // Calificaciones
  let calQuery = supabase.from('calificaciones').select('id_tecnico, puntuacion')
  if (filtros.idTecnico) calQuery = calQuery.eq('id_tecnico', filtros.idTecnico)
  if (filtros.fechaDesde) calQuery = calQuery.gte('fecha_calificacion', filtros.fechaDesde)
  if (filtros.fechaHasta) calQuery = calQuery.lte('fecha_calificacion', filtros.fechaHasta)

  const [tecnicosRes, asigRes, calRes] = await Promise.all([tecnicosQuery, asigQuery, calQuery])

  const tecnicos = tecnicosRes.data || []
  const asignaciones = asigRes.data || []

  // Mapa de calificaciones
  const calMap: Record<number, number[]> = {}
  for (const c of (calRes.data || [])) {
    if (!calMap[c.id_tecnico]) calMap[c.id_tecnico] = []
    calMap[c.id_tecnico].push(c.puntuacion || 0)
  }

  // Agrupar asignaciones por técnico
  const tecMap: Record<number, {
    asignados: number; cerrados: number; rechazadas: number; diasRespuestaList: number[]
  }> = {}
  for (const t of tecnicos) {
    tecMap[t.id_tecnico] = { asignados: 0, cerrados: 0, rechazadas: 0, diasRespuestaList: [] }
  }

  for (const a of asignaciones) {
    const entry = tecMap[a.id_tecnico]
    if (!entry) continue
    entry.asignados++
    if (a.estado_asignacion === 'completada') entry.cerrados++
    if (a.estado_asignacion === 'rechazada' || a.estado_asignacion === 'cancelada') entry.rechazadas++
    // Tiempo de respuesta: días desde registro incidente hasta asignación
    const inc = Array.isArray(a.incidentes) ? a.incidentes[0] : a.incidentes
    if (inc?.fecha_registro && a.fecha_asignacion) {
      const dias = diasEntre(inc.fecha_registro, a.fecha_asignacion)
      if (dias >= 0) entry.diasRespuestaList.push(dias)
    }
  }

  const result = tecnicos.map((t: any) => {
    const m = tecMap[t.id_tecnico] || { asignados: 0, cerrados: 0, rechazadas: 0, diasRespuestaList: [] }
    const puntList = calMap[t.id_tecnico] || []
    const satisfaccion = puntList.length > 0
      ? puntList.reduce((a: number, b: number) => a + b, 0) / puntList.length
      : null
    const promedioDiasRespuesta = m.diasRespuestaList.length > 0
      ? m.diasRespuestaList.reduce((a, b) => a + b, 0) / m.diasRespuestaList.length
      : 0
    const productividad = m.asignados > 0 ? (m.cerrados / m.asignados) * 100 : 0
    return {
      id_tecnico: t.id_tecnico,
      nombre: t.nombre || '',
      apellido: t.apellido || '',
      especialidad: t.especialidad || '',
      asignados: m.asignados,
      cerrados: m.cerrados,
      rechazadas: m.rechazadas,
      productividad,
      satisfaccion,
      promedioDiasRespuesta,
      rankingPos: 0,
    }
  })
    .sort((a, b) => b.productividad - a.productividad)
    .map((t, idx) => ({ ...t, rankingPos: idx + 1 }))

  const totalTecnicos = result.length
  const promedioProductividad = totalTecnicos > 0
    ? result.reduce((s, t) => s + t.productividad, 0) / totalTecnicos
    : 0
  const conSatisfaccion = result.filter(t => t.satisfaccion !== null)
  const promedioSatisfaccion = conSatisfaccion.length > 0
    ? conSatisfaccion.reduce((s, t) => s + (t.satisfaccion || 0), 0) / conSatisfaccion.length
    : 0

  return { totalTecnicos, promedioProductividad, promedioSatisfaccion, tecnicos: result }
}

// ─── R7: Satisfacción de ISBA ─────────────────────────────────────────────────

export async function getR7Satisfaccion(filtros: {
  fechaDesde?: string
  fechaHasta?: string
  idTecnico?: number
  calificacionMinima?: number
}): Promise<R7Resultado> {
  const supabase = createAdminClient()

  let query = supabase
    .from('calificaciones')
    .select('id_tecnico, puntuacion, comentarios, fecha_calificacion, tecnicos (nombre, apellido)')

  if (filtros.fechaDesde) query = query.gte('fecha_calificacion', filtros.fechaDesde)
  if (filtros.fechaHasta) query = query.lte('fecha_calificacion', filtros.fechaHasta)
  if (filtros.idTecnico) query = query.eq('id_tecnico', filtros.idTecnico)
  if (filtros.calificacionMinima) query = query.gte('puntuacion', filtros.calificacionMinima)

  const { data, error } = await query
  if (error) throw error

  const tecMap: Record<number, any> = {}
  for (const c of (data || [])) {
    const tec = Array.isArray(c.tecnicos) ? c.tecnicos[0] : c.tecnicos
    if (!tecMap[c.id_tecnico]) {
      tecMap[c.id_tecnico] = {
        id_tecnico: c.id_tecnico,
        nombre: tec?.nombre || '',
        apellido: tec?.apellido || '',
        puntuaciones: [],
        comentarios: [],
      }
    }
    tecMap[c.id_tecnico].puntuaciones.push(c.puntuacion || 0)
    if (c.comentarios) tecMap[c.id_tecnico].comentarios.push(c.comentarios)
  }

  const tecnicos = Object.values(tecMap).map((t: any) => {
    const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    for (const p of t.puntuaciones) dist[String(Math.round(p))] = (dist[String(Math.round(p))] || 0) + 1
    return {
      id_tecnico: t.id_tecnico,
      nombre: t.nombre,
      apellido: t.apellido,
      promedioPuntuacion: t.puntuaciones.length > 0
        ? t.puntuaciones.reduce((a: number, b: number) => a + b, 0) / t.puntuaciones.length
        : 0,
      totalEvaluaciones: t.puntuaciones.length,
      distribucion: dist,
      comentarios: t.comentarios.slice(0, 5),
    }
  }).sort((a, b) => b.promedioPuntuacion - a.promedioPuntuacion)

  const totalEvaluaciones = tecnicos.reduce((s, t) => s + t.totalEvaluaciones, 0)
  const promedioGlobal = totalEvaluaciones > 0
    ? tecnicos.reduce((s, t) => s + t.promedioPuntuacion * t.totalEvaluaciones, 0) / totalEvaluaciones
    : 0

  return { promedioGlobal, totalEvaluaciones, tecnicos }
}

// ─── R8: Costos de Mantenimiento ─────────────────────────────────────────────

export async function getR8CostosMantenimiento(filtros: {
  fechaDesde?: string
  fechaHasta?: string
  categoria?: string
}): Promise<R8Resultado> {
  const supabase = createAdminClient()

  let query = supabase
    .from('presupuestos')
    .select(`
      costo_materiales,
      costo_mano_obra,
      gastos_administrativos,
      costo_total,
      incidentes (id_incidente, categoria, fecha_registro)
    `)

  const { data, error } = await query
  if (error) throw error

  const catMap: Record<string, any> = {}

  for (const p of (data || [])) {
    const inc = Array.isArray(p.incidentes) ? p.incidentes[0] : p.incidentes
    const fechaReg = inc?.fecha_registro || ''
    if (filtros.fechaDesde && fechaReg && fechaReg < filtros.fechaDesde) continue
    if (filtros.fechaHasta && fechaReg && fechaReg > filtros.fechaHasta) continue
    const cat = inc?.categoria || 'Sin categoría'
    if (filtros.categoria && cat !== filtros.categoria) continue

    if (!catMap[cat]) {
      catMap[cat] = { categoria: cat, costoTotal: 0, materiales: 0, manoObra: 0, gastosAdmin: 0, count: 0 }
    }
    catMap[cat].costoTotal += p.costo_total || 0
    catMap[cat].materiales += p.costo_materiales || 0
    catMap[cat].manoObra += p.costo_mano_obra || 0
    catMap[cat].gastosAdmin += p.gastos_administrativos || 0
    catMap[cat].count++
  }

  const porCategoria = Object.values(catMap)
    .map((c: any) => ({
      categoria: c.categoria,
      costoTotal: c.costoTotal,
      materiales: c.materiales,
      manoObra: c.manoObra,
      gastosAdmin: c.gastosAdmin,
      totalIncidentes: c.count,
      promedioCosto: c.count > 0 ? c.costoTotal / c.count : 0,
    }))
    .sort((a, b) => b.costoTotal - a.costoTotal)

  const costoTotal = porCategoria.reduce((s, c) => s + c.costoTotal, 0)
  const totalIncidentes = porCategoria.reduce((s, c) => s + c.totalIncidentes, 0)

  return {
    costoTotal,
    totalIncidentes,
    costoPromedio: totalIncidentes > 0 ? costoTotal / totalIncidentes : 0,
    presupuestoTotal: costoTotal,
    porCategoria,
  }
}

// ─── R10: Rentabilidad por Inmueble ──────────────────────────────────────────

export async function getR10RentabilidadInmueble(filtros: {
  fechaDesde?: string
  fechaHasta?: string
  idInmueble?: number
  topN?: number
}): Promise<R10Resultado> {
  const supabase = createAdminClient()

  // Ingresos: pagos por incidente por inmueble
  let incQuery = supabase
    .from('incidentes')
    .select('id_incidente, id_propiedad, fecha_registro, inmuebles:id_propiedad (id_inmueble, calle, altura, localidad)')

  if (filtros.fechaDesde) incQuery = incQuery.gte('fecha_registro', filtros.fechaDesde)
  if (filtros.fechaHasta) incQuery = incQuery.lte('fecha_registro', filtros.fechaHasta)
  if (filtros.idInmueble) incQuery = incQuery.eq('id_propiedad', filtros.idInmueble)

  const { data: incidentes, error: incErr } = await incQuery
  if (incErr) throw incErr

  const incIds = (incidentes || []).map((i: any) => i.id_incidente)
  if (!incIds.length) {
    return { ingresosTotal: 0, costosTotal: 0, rentabilidadNeta: 0, margenGlobal: 0, inmuebles: [] }
  }

  const [pagosRes, presupuestosRes] = await Promise.all([
    supabase.from('pagos').select('id_incidente, monto_pagado').in('id_incidente', incIds),
    supabase.from('presupuestos').select('id_incidente, costo_total').in('id_incidente', incIds),
  ])

  const ingresosPorIncidente: Record<number, number> = {}
  for (const p of (pagosRes.data || [])) {
    ingresosPorIncidente[p.id_incidente] = (ingresosPorIncidente[p.id_incidente] || 0) + (p.monto_pagado || 0)
  }
  const costosPorIncidente: Record<number, number> = {}
  for (const p of (presupuestosRes.data || [])) {
    costosPorIncidente[p.id_incidente] = (costosPorIncidente[p.id_incidente] || 0) + (p.costo_total || 0)
  }

  const inmuebleMap: Record<number, any> = {}
  for (const inc of (incidentes || [])) {
    const inm = Array.isArray(inc.inmuebles) ? inc.inmuebles[0] : inc.inmuebles
    if (!inm) continue
    const id = inm.id_inmueble
    if (!inmuebleMap[id]) {
      inmuebleMap[id] = {
        id_inmueble: id,
        nombre: `${inm.calle || ''} ${inm.altura || ''}`.trim(),
        ingresos: 0,
        costos: 0,
        totalIncidentes: 0,
      }
    }
    inmuebleMap[id].ingresos += ingresosPorIncidente[inc.id_incidente] || 0
    inmuebleMap[id].costos += costosPorIncidente[inc.id_incidente] || 0
    inmuebleMap[id].totalIncidentes++
  }

  const topN = filtros.topN || 10
  const result = Object.values(inmuebleMap)
    .map((i: any) => ({
      id_inmueble: i.id_inmueble,
      nombre: i.nombre,
      ingresos: i.ingresos,
      costos: i.costos,
      rentabilidadNeta: i.ingresos - i.costos,
      margen: i.ingresos > 0 ? ((i.ingresos - i.costos) / i.ingresos) * 100 : 0,
      totalIncidentes: i.totalIncidentes,
    }))
    .sort((a, b) => b.rentabilidadNeta - a.rentabilidadNeta)
    .slice(0, topN)

  const ingresosTotal = result.reduce((s, i) => s + i.ingresos, 0)
  const costosTotal = result.reduce((s, i) => s + i.costos, 0)
  const rentabilidadNeta = ingresosTotal - costosTotal

  return {
    ingresosTotal,
    costosTotal,
    rentabilidadNeta,
    margenGlobal: ingresosTotal > 0 ? (rentabilidadNeta / ingresosTotal) * 100 : 0,
    inmuebles: result,
  }
}

// ─── R11: Comparativo de Desempeño ───────────────────────────────────────────

export async function getR11ComparativoDesempenio(filtros: {
  fechaDesde?: string
  fechaHasta?: string
  periodo?: 'trimestral' | 'semestral' | 'anual'
}): Promise<R11Resultado> {
  const supabase = createAdminClient()

  const ahora = new Date()
  let d1: Date, d2: Date, d3: Date

  if (filtros.fechaDesde && filtros.fechaHasta) {
    d1 = new Date(filtros.fechaDesde)
    d3 = new Date(filtros.fechaHasta)
    d2 = new Date((d1.getTime() + d3.getTime()) / 2)
  } else {
    const meses = filtros.periodo === 'anual' ? 12 : filtros.periodo === 'semestral' ? 6 : 3
    d3 = ahora
    d1 = new Date(ahora)
    d1.setMonth(d1.getMonth() - meses)
    d2 = new Date((d1.getTime() + d3.getTime()) / 2)
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const p1Desde = fmt(d1)
  const p1Hasta = fmt(d2)
  const p2Desde = fmt(new Date(d2.getTime() + 86400000))
  const p2Hasta = fmt(d3)

  const fetchKpis = async (desde: string, hasta: string) => {
    const [incRes, pagosRes, calRes] = await Promise.all([
      supabase.from('incidentes').select('id_incidente, estado_actual, fecha_registro, fecha_cierre')
        .gte('fecha_registro', desde).lte('fecha_registro', hasta),
      supabase.from('pagos').select('monto_pagado, fecha_pago')
        .gte('fecha_pago', desde).lte('fecha_pago', hasta),
      supabase.from('calificaciones').select('puntuacion, fecha_calificacion')
        .gte('fecha_calificacion', desde).lte('fecha_calificacion', hasta),
    ])

    const incs = incRes.data || []
    const pagos = pagosRes.data || []
    const cals = calRes.data || []

    const resueltos = incs.filter(i => i.estado_actual === 'finalizado' || i.estado_actual === 'resuelto')
    const dias = resueltos
      .filter(i => i.fecha_registro && i.fecha_cierre)
      .map(i => diasEntre(i.fecha_registro, i.fecha_cierre))
    const promDias = dias.length > 0 ? dias.reduce((a, b) => a + b, 0) / dias.length : 0
    const ingresos = pagos.reduce((s, p) => s + (p.monto_pagado || 0), 0)
    const puntuaciones = cals.map(c => c.puntuacion || 0)
    const promCal = puntuaciones.length > 0 ? puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length : 0

    return { total: incs.length, resueltos: resueltos.length, promDias, ingresos, promCal }
  }

  const [kp1, kp2] = await Promise.all([fetchKpis(p1Desde, p1Hasta), fetchKpis(p2Desde, p2Hasta)])

  const calcCambio = (v1: number, v2: number) => v1 > 0 ? ((v2 - v1) / v1) * 100 : 0
  const tendencia = (v1: number, v2: number): 'sube' | 'baja' | 'igual' =>
    v2 > v1 ? 'sube' : v2 < v1 ? 'baja' : 'igual'

  const indicadores = [
    { indicador: 'Total incidentes', periodo1: kp1.total, periodo2: kp2.total, cambioPorcentaje: calcCambio(kp1.total, kp2.total), tendencia: tendencia(kp1.total, kp2.total) },
    { indicador: 'Incidentes resueltos', periodo1: kp1.resueltos, periodo2: kp2.resueltos, cambioPorcentaje: calcCambio(kp1.resueltos, kp2.resueltos), tendencia: tendencia(kp1.resueltos, kp2.resueltos) },
    { indicador: 'Días promedio resolución', periodo1: kp1.promDias, periodo2: kp2.promDias, cambioPorcentaje: calcCambio(kp1.promDias, kp2.promDias), tendencia: tendencia(kp2.promDias, kp1.promDias) },
    { indicador: 'Ingresos ($)', periodo1: kp1.ingresos, periodo2: kp2.ingresos, cambioPorcentaje: calcCambio(kp1.ingresos, kp2.ingresos), tendencia: tendencia(kp1.ingresos, kp2.ingresos) },
    { indicador: 'Satisfacción promedio', periodo1: kp1.promCal, periodo2: kp2.promCal, cambioPorcentaje: calcCambio(kp1.promCal, kp2.promCal), tendencia: tendencia(kp1.promCal, kp2.promCal) },
  ]

  return {
    periodo1Label: `${p1Desde} → ${p1Hasta}`,
    periodo2Label: `${p2Desde} → ${p2Hasta}`,
    indicadores,
  }
}

// ─── R12: Indicadores Globales ───────────────────────────────────────────────

export async function getR12IndicadoresGlobales(filtros: {
  fechaDesde?: string
  fechaHasta?: string
  topTecnicos?: number
  topPropiedades?: number
}): Promise<R12Resultado> {
  const supabase = createAdminClient()

  let incQuery = supabase
    .from('incidentes')
    .select('id_incidente, estado_actual, fecha_registro, fecha_cierre, id_propiedad, inmuebles:id_propiedad (calle, altura, localidad)')
  if (filtros.fechaDesde) incQuery = incQuery.gte('fecha_registro', filtros.fechaDesde)
  if (filtros.fechaHasta) incQuery = incQuery.lte('fecha_registro', filtros.fechaHasta)

  const [incRes, pagosRes, presRes, calRes, asigRes] = await Promise.all([
    incQuery,
    (() => {
      let q = supabase.from('pagos').select('monto_pagado, fecha_pago')
      if (filtros.fechaDesde) q = q.gte('fecha_pago', filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte('fecha_pago', filtros.fechaHasta)
      return q
    })(),
    (() => {
      let q = supabase.from('presupuestos').select('costo_total, incidentes (fecha_registro)')
      return q
    })(),
    (() => {
      let q = supabase.from('calificaciones').select('id_tecnico, puntuacion, tecnicos (nombre, apellido)')
      if (filtros.fechaDesde) q = q.gte('fecha_calificacion', filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte('fecha_calificacion', filtros.fechaHasta)
      return q
    })(),
    (() => {
      let q = supabase.from('asignaciones_tecnico').select('id_tecnico, estado_asignacion, tecnicos (nombre, apellido)')
      if (filtros.fechaDesde) q = q.gte('fecha_asignacion', filtros.fechaDesde)
      if (filtros.fechaHasta) q = q.lte('fecha_asignacion', filtros.fechaHasta)
      return q
    })(),
  ])

  const incs = incRes.data || []
  const cerrados = incs.filter(i => i.estado_actual === 'finalizado' || i.estado_actual === 'resuelto')
  const diasList = cerrados
    .filter(i => i.fecha_registro && i.fecha_cierre)
    .map(i => diasEntre(i.fecha_registro, i.fecha_cierre))
  const promedioResolucionDias = diasList.length > 0
    ? diasList.reduce((a, b) => a + b, 0) / diasList.length : 0

  const totalIngresos = (pagosRes.data || []).reduce((s, p) => s + (p.monto_pagado || 0), 0)
  const totalCostos = (presRes.data || []).reduce((s, p: any) => s + (p.costo_total || 0), 0)

  const puntuaciones = (calRes.data || []).map((c: any) => c.puntuacion || 0)
  const satisfaccionPromedio = puntuaciones.length > 0
    ? puntuaciones.reduce((a: number, b: number) => a + b, 0) / puntuaciones.length : 0

  // Top técnicos por asignaciones completadas
  const tecMap: Record<number, any> = {}
  for (const a of (asigRes.data || [])) {
    const tec = Array.isArray(a.tecnicos) ? a.tecnicos[0] : a.tecnicos
    if (!tecMap[a.id_tecnico]) {
      tecMap[a.id_tecnico] = { nombre: tec?.nombre || '', apellido: tec?.apellido || '', asignados: 0, cerrados: 0 }
    }
    tecMap[a.id_tecnico].asignados++
    if (a.estado_asignacion === 'completada') tecMap[a.id_tecnico].cerrados++
  }
  const calTecMap: Record<number, number[]> = {}
  for (const c of (calRes.data || [])) {
    if (!calTecMap[c.id_tecnico]) calTecMap[c.id_tecnico] = []
    calTecMap[c.id_tecnico].push(c.puntuacion || 0)
  }

  const topN = filtros.topTecnicos || 5
  const topTecnicos = Object.entries(tecMap)
    .map(([id, t]: any) => {
      const punts = calTecMap[Number(id)] || []
      return {
        nombre: t.nombre,
        apellido: t.apellido,
        asignados: t.asignados,
        cerrados: t.cerrados,
        satisfaccion: punts.length > 0 ? punts.reduce((a: number, b: number) => a + b, 0) / punts.length : 0,
      }
    })
    .sort((a, b) => b.cerrados - a.cerrados)
    .slice(0, topN)

  // Top propiedades por incidentes
  const propMap: Record<number, any> = {}
  for (const inc of incs) {
    const inm = Array.isArray(inc.inmuebles) ? inc.inmuebles[0] : inc.inmuebles
    if (!inm) continue
    const id = inc.id_propiedad
    if (!propMap[id]) {
      propMap[id] = {
        nombre: `${inm.calle || ''} ${inm.altura || ''}`.trim(),
        direccion: `${inm.calle || ''}, ${inm.localidad || ''}`.trim(),
        incidentes: 0,
        costoTotal: 0,
      }
    }
    propMap[id].incidentes++
  }

  const topP = filtros.topPropiedades || 5
  const topPropiedades = Object.values(propMap)
    .sort((a: any, b: any) => b.incidentes - a.incidentes)
    .slice(0, topP)
    .map((p: any) => ({ nombre: p.nombre, direccion: p.direccion, incidentes: p.incidentes, costoTotal: p.costoTotal }))

  return {
    totalIncidentes: incs.length,
    incidentesAbiertos: incs.length - cerrados.length,
    incidentesCerrados: cerrados.length,
    promedioResolucionDias,
    totalIngresos,
    totalCostos,
    rentabilidadNeta: totalIngresos - totalCostos,
    satisfaccionPromedio,
    topTecnicos,
    topPropiedades,
  }
}

// ─── R13: Medios de Pago ──────────────────────────────────────────────────────

export async function getR13MediosDePago(filtro?: FiltroFechas): Promise<R13Resultado> {
  const supabase = createAdminClient()

  let qCobros = supabase
    .from('cobros_clientes')
    .select('metodo_pago, monto_cobro, fecha_cobro')
  if (filtro?.fechaDesde) qCobros = qCobros.gte('fecha_cobro', filtro.fechaDesde)
  if (filtro?.fechaHasta) qCobros = qCobros.lte('fecha_cobro', filtro.fechaHasta)
  const { data: cobros } = await qCobros
  const cobrosArr = cobros || []

  let qPagos = supabase
    .from('pagos_tecnicos')
    .select('metodo_pago, monto_pago, fecha_pago')
  if (filtro?.fechaDesde) qPagos = qPagos.gte('fecha_pago', filtro.fechaDesde)
  if (filtro?.fechaHasta) qPagos = qPagos.lte('fecha_pago', filtro.fechaHasta)
  const { data: pagos } = await qPagos
  const pagosArr = pagos || []

  const metodosSet = new Set<string>([
    ...cobrosArr.map((c: any) => c.metodo_pago ?? 'Sin especificar'),
    ...pagosArr.map((p: any) => p.metodo_pago ?? 'Sin especificar'),
  ])

  const porMetodo = Array.from(metodosSet).map(metodo => {
    const cobrosMetodo = cobrosArr.filter((c: any) => (c.metodo_pago ?? 'Sin especificar') === metodo)
    const pagosMetodo = pagosArr.filter((p: any) => (p.metodo_pago ?? 'Sin especificar') === metodo)
    const montoCobradoClientes = cobrosMetodo.reduce((s: number, c: any) => s + (Number(c.monto_cobro) || 0), 0)
    const montoPagadoTecnicos = pagosMetodo.reduce((s: number, p: any) => s + (Number(p.monto_pago) || 0), 0)
    return {
      metodo,
      cantidad: cobrosMetodo.length + pagosMetodo.length,
      montoCobradoClientes,
      montoPagadoTecnicos,
      montoTotal: montoCobradoClientes + montoPagadoTecnicos,
    }
  }).sort((a, b) => b.montoTotal - a.montoTotal)

  return {
    totalCobradoClientes: cobrosArr.reduce((s: number, c: any) => s + (Number(c.monto_cobro) || 0), 0),
    totalPagadoTecnicos: pagosArr.reduce((s: number, p: any) => s + (Number(p.monto_pago) || 0), 0),
    cantidadCobros: cobrosArr.length,
    cantidadPagos: pagosArr.length,
    porMetodo,
  }
}
