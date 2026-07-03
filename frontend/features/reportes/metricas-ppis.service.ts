'use server'

/**
 * Servicio de PPIs (Process Performance Indicators)
 * Métricas de proceso basadas en el framework BPM CBOK — 9 pasos, 4 dimensiones.
 * Cada función calcula un PPI específico con todos los datos necesarios para
 * mostrar semáforos, tendencias y desglose por dimensión.
 */

import { createAdminClient } from '@/shared/lib/supabase/admin'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'sin_datos'

export interface TciPorPrioridad {
  prioridad: string
  promedioDias: number
  count: number
  semaforo: Semaforo
  umbralVerde: number
  umbralAmarillo: number
}

export interface TciPorCategoria {
  categoria: string
  promedioDias: number
  count: number
}

export interface TciMensual {
  mes: string      // "2026-01"
  label: string    // "Ene 26"
  promedioDias: number
  count: number
}

export interface TciData {
  promedioDiasGlobal: number | null
  semaforoGlobal: Semaforo
  totalIncidentesConCierre: number
  porPrioridad: TciPorPrioridad[]
  porCategoria: TciPorCategoria[]
  tendenciaMensual: TciMensual[]
}

// Umbrales por prioridad (días) — definidos según criterio de negocio ISBA
const UMBRALES_TCI: Record<string, { verde: number; amarillo: number }> = {
  Urgente:  { verde: 7,  amarillo: 14 },
  Alta:     { verde: 15, amarillo: 25 },
  Normal:   { verde: 30, amarillo: 45 },
  default:  { verde: 30, amarillo: 45 },
}

function calcularSemaforo(dias: number, prioridad = 'default'): Semaforo {
  const umbrales = UMBRALES_TCI[prioridad] ?? UMBRALES_TCI.default
  if (dias <= umbrales.verde)   return 'verde'
  if (dias <= umbrales.amarillo) return 'amarillo'
  return 'rojo'
}

function mesLabel(isoMes: string): string {
  const [anio, mes] = isoMes.split('-')
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${nombres[parseInt(mes) - 1]} ${anio.slice(2)}`
}

// ─── PPI-E2E · Tiempo de Ciclo del Incidente (TCI) ───────────────────────────

/**
 * Calcula el Tiempo de Ciclo del Incidente (TCI) — PPI E2E ancla.
 *
 * Mide los días promedio desde fecha_registro hasta fecha_cierre para todos
 * los incidentes finalizados. Incluye desglose por prioridad, por categoría y
 * tendencia mensual de los últimos 12 meses.
 */
export async function getTciData(): Promise<TciData> {
  const supabase = createAdminClient()

  const { data: incidentes, error } = await supabase
    .from('incidentes')
    .select('id_incidente, categoria, nivel_prioridad, fecha_registro, fecha_cierre')
    .not('fecha_cierre', 'is', null)
    .eq('fue_resuelto', 1)
    .order('fecha_cierre', { ascending: false })

  if (error || !incidentes?.length) {
    return {
      promedioDiasGlobal: null,
      semaforoGlobal: 'sin_datos',
      totalIncidentesConCierre: 0,
      porPrioridad: [],
      porCategoria: [],
      tendenciaMensual: [],
    }
  }

  // Calcular días de ciclo por incidente
  const conDias = incidentes.map(inc => ({
    ...inc,
    dias: (new Date(inc.fecha_cierre!).getTime() - new Date(inc.fecha_registro).getTime()) / 86_400_000,
    mesCierre: inc.fecha_cierre!.slice(0, 7), // "YYYY-MM"
  })).filter(inc => inc.dias >= 0)

  // ── Promedio global ────────────────────────────────────────────────────────
  const promedioDiasGlobal = conDias.length
    ? Math.round(conDias.reduce((s, i) => s + i.dias, 0) / conDias.length)
    : null

  const semaforoGlobal: Semaforo = promedioDiasGlobal !== null
    ? calcularSemaforo(promedioDiasGlobal)
    : 'sin_datos'

  // ── Por prioridad ──────────────────────────────────────────────────────────
  const prioridadMap = new Map<string, number[]>()
  for (const inc of conDias) {
    const p = inc.nivel_prioridad ?? 'Sin prioridad'
    if (!prioridadMap.has(p)) prioridadMap.set(p, [])
    prioridadMap.get(p)!.push(inc.dias)
  }

  const ordenPrioridad = ['Urgente', 'Alta', 'Normal', 'Sin prioridad']
  const porPrioridad: TciPorPrioridad[] = [...prioridadMap.entries()]
    .sort((a, b) => {
      const ia = ordenPrioridad.indexOf(a[0])
      const ib = ordenPrioridad.indexOf(b[0])
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    .map(([prioridad, dias]) => {
      const promedio = Math.round(dias.reduce((s, d) => s + d, 0) / dias.length)
      const umbrales = UMBRALES_TCI[prioridad] ?? UMBRALES_TCI.default
      return {
        prioridad,
        promedioDias: promedio,
        count: dias.length,
        semaforo: calcularSemaforo(promedio, prioridad),
        umbralVerde: umbrales.verde,
        umbralAmarillo: umbrales.amarillo,
      }
    })

  // ── Por categoría ──────────────────────────────────────────────────────────
  const categoriaMap = new Map<string, number[]>()
  for (const inc of conDias) {
    const c = inc.categoria ?? 'Sin categoría'
    if (!categoriaMap.has(c)) categoriaMap.set(c, [])
    categoriaMap.get(c)!.push(inc.dias)
  }

  const porCategoria: TciPorCategoria[] = [...categoriaMap.entries()]
    .map(([categoria, dias]) => ({
      categoria,
      promedioDias: Math.round(dias.reduce((s, d) => s + d, 0) / dias.length),
      count: dias.length,
    }))
    .sort((a, b) => b.promedioDias - a.promedioDias)

  // ── Tendencia mensual (últimos 12 meses) ───────────────────────────────────
  const mesMap = new Map<string, number[]>()
  for (const inc of conDias) {
    if (!mesMap.has(inc.mesCierre)) mesMap.set(inc.mesCierre, [])
    mesMap.get(inc.mesCierre)!.push(inc.dias)
  }

  // Generar los últimos 12 meses como referencia
  const hoy = new Date()
  const mesesRef: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    mesesRef.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const tendenciaMensual: TciMensual[] = mesesRef
    .filter(m => mesMap.has(m))
    .map(m => {
      const dias = mesMap.get(m)!
      return {
        mes: m,
        label: mesLabel(m),
        promedioDias: Math.round(dias.reduce((s, d) => s + d, 0) / dias.length),
        count: dias.length,
      }
    })

  return {
    promedioDiasGlobal,
    semaforoGlobal,
    totalIncidentesConCierre: conDias.length,
    porPrioridad,
    porCategoria,
    tendenciaMensual,
  }
}

// ─── FPY Global del Proceso ───────────────────────────────────────────────────

export interface FpyEtapa {
  nombre: string        // Nombre legible
  codigo: string        // Identificador corto
  descripcion: string   // Qué mide esta etapa
  totalPasos: number    // Total de veces que ocurrió esta etapa
  pasosSinRetrabajo: number
  fpy: number           // 0–100
  semaforo: Semaforo
}

export interface FpyMensual {
  mes: string
  label: string
  fpy: number
  totalFinalizados: number
  sinRetrabajo: number
}

export interface FpyData {
  fpyGlobal: number | null
  semaforoGlobal: Semaforo
  totalFinalizados: number
  totalSinRetrabajo: number
  porEtapa: FpyEtapa[]
  tendenciaMensual: FpyMensual[]
}

function calcularSemaforoFpy(fpy: number, esGlobal = false): Semaforo {
  if (esGlobal) {
    if (fpy >= 60) return 'verde'
    if (fpy >= 40) return 'amarillo'
    return 'rojo'
  }
  // Por etapa — umbrales más exigentes
  if (fpy >= 80) return 'verde'
  if (fpy >= 60) return 'amarillo'
  return 'rojo'
}

/**
 * Calcula el First-Pass Yield (FPY) Global y por etapa del proceso E2E.
 *
 * Un incidente "sin retrabajo" es aquel que completó todas las etapas
 * sin ningún rechazo, reasignación ni conformidad rechazada.
 * Concepto del Caso Bancario (TF): % de legajos completos al primer intento.
 *
 * Etapas medidas:
 *   1. FPY Asignación     → asignaciones sin rechazos ni cancelaciones
 *   2. FPY Presupuesto    → presupuestos no rechazados por admin
 *   3. FPY Conformidad    → conformidades aprobadas sin rechazo previo
 *   Global                → incidentes finalizados sin retrabajo en NINGUNA etapa
 */
export async function getFpyData(): Promise<FpyData> {
  const supabase = createAdminClient()

  // Traer todos los incidentes finalizados con sus relaciones
  const { data: incidentes, error } = await supabase
    .from('incidentes')
    .select(`
      id_incidente,
      fecha_cierre,
      asignaciones_tecnico (id_asignacion, estado_asignacion),
      presupuestos (id_presupuesto, estado_presupuesto),
      conformidades (id_conformidad, esta_rechazada)
    `)
    .eq('fue_resuelto', 1)
    .not('fecha_cierre', 'is', null)

  if (error || !incidentes?.length) {
    return {
      fpyGlobal: null,
      semaforoGlobal: 'sin_datos',
      totalFinalizados: 0,
      totalSinRetrabajo: 0,
      porEtapa: [],
      tendenciaMensual: [],
    }
  }

  // ── Análisis de retrabajo por incidente ────────────────────────────────────
  type IncAnalizado = {
    id: number
    mesCierre: string
    retrabajoAsignacion: boolean  // tuvo asignación rechazada o cancelada
    retrabajoPresupuesto: boolean // tuvo presupuesto rechazado por admin
    retrabajoConformidad: boolean // tuvo conformidad rechazada
  }

  const analizados: IncAnalizado[] = incidentes.map(inc => {
    const asigs = (inc.asignaciones_tecnico as any[]) ?? []
    const press = (inc.presupuestos as any[]) ?? []
    const confs = (inc.conformidades as any[]) ?? []

    return {
      id: inc.id_incidente,
      mesCierre: (inc.fecha_cierre as string).slice(0, 7),
      retrabajoAsignacion: asigs.some((a: any) =>
        a.estado_asignacion === 'rechazada' || a.estado_asignacion === 'cancelada'
      ),
      retrabajoPresupuesto: press.some((p: any) =>
        p.estado_presupuesto === 'rechazado'
      ),
      retrabajoConformidad: confs.some((c: any) =>
        c.esta_rechazada === true || c.esta_rechazada === 1
      ),
    }
  })

  const totalFinalizados = analizados.length
  const sinRetrabajo = analizados.filter(i =>
    !i.retrabajoAsignacion && !i.retrabajoPresupuesto && !i.retrabajoConformidad
  )
  const totalSinRetrabajo = sinRetrabajo.length
  const fpyGlobal = totalFinalizados > 0
    ? Math.round((totalSinRetrabajo / totalFinalizados) * 100)
    : null

  // ── FPY por etapa ──────────────────────────────────────────────────────────
  // Etapa 1: Asignación
  const conAsig = analizados.filter(i =>
    (i as any) && incidentes.find(inc => inc.id_incidente === i.id)
      ?.asignaciones_tecnico?.length
  )
  const asigTotal = analizados.length
  const asigSinRetrabajo = analizados.filter(i => !i.retrabajoAsignacion).length
  const fpyAsig = asigTotal > 0 ? Math.round((asigSinRetrabajo / asigTotal) * 100) : 0

  // Etapa 2: Presupuesto Admin
  const presTotal = analizados.filter(i =>
    ((incidentes.find(inc => inc.id_incidente === i.id)?.presupuestos as any[]) ?? []).length > 0
  ).length
  const presSinRetrabajo = analizados.filter(i =>
    ((incidentes.find(inc => inc.id_incidente === i.id)?.presupuestos as any[]) ?? []).length > 0
    && !i.retrabajoPresupuesto
  ).length
  const fpyPres = presTotal > 0 ? Math.round((presSinRetrabajo / presTotal) * 100) : 0

  // Etapa 3: Conformidad
  const confTotal = analizados.filter(i =>
    ((incidentes.find(inc => inc.id_incidente === i.id)?.conformidades as any[]) ?? []).length > 0
  ).length
  const confSinRetrabajo = analizados.filter(i =>
    ((incidentes.find(inc => inc.id_incidente === i.id)?.conformidades as any[]) ?? []).length > 0
    && !i.retrabajoConformidad
  ).length
  const fpyConf = confTotal > 0 ? Math.round((confSinRetrabajo / confTotal) * 100) : 0

  const porEtapa: FpyEtapa[] = [
    {
      nombre: 'Asignación',
      codigo: 'FPY-1',
      descripcion: '% de incidentes donde el primer técnico asignado aceptó sin rechazos ni cancelaciones previas.',
      totalPasos: asigTotal,
      pasosSinRetrabajo: asigSinRetrabajo,
      fpy: fpyAsig,
      semaforo: calcularSemaforoFpy(fpyAsig),
    },
    {
      nombre: 'Presupuesto',
      codigo: 'FPY-2',
      descripcion: '% de presupuestos enviados por el técnico que el admin aprobó sin rechazar ninguno previamente.',
      totalPasos: presTotal,
      pasosSinRetrabajo: presSinRetrabajo,
      fpy: fpyPres,
      semaforo: calcularSemaforoFpy(fpyPres),
    },
    {
      nombre: 'Conformidad',
      codigo: 'FPY-3',
      descripcion: '% de conformidades subidas por el técnico que el admin aprobó sin haber rechazado ninguna previamente.',
      totalPasos: confTotal,
      pasosSinRetrabajo: confSinRetrabajo,
      fpy: fpyConf,
      semaforo: calcularSemaforoFpy(fpyConf),
    },
  ]

  // ── Tendencia mensual (últimos 12 meses) ───────────────────────────────────
  const hoy = new Date()
  const mesesRef: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    mesesRef.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const tendenciaMensual: FpyMensual[] = mesesRef
    .map(m => {
      const delMes = analizados.filter(i => i.mesCierre === m)
      if (!delMes.length) return null
      const sinR = delMes.filter(i =>
        !i.retrabajoAsignacion && !i.retrabajoPresupuesto && !i.retrabajoConformidad
      ).length
      return {
        mes: m,
        label: mesLabel(m),
        fpy: Math.round((sinR / delMes.length) * 100),
        totalFinalizados: delMes.length,
        sinRetrabajo: sinR,
      }
    })
    .filter(Boolean) as FpyMensual[]

  return {
    fpyGlobal,
    semaforoGlobal: fpyGlobal !== null ? calcularSemaforoFpy(fpyGlobal, true) : 'sin_datos',
    totalFinalizados,
    totalSinRetrabajo,
    porEtapa,
    tendenciaMensual,
  }
}

// ─── CB-1 · Distribución WIP por Etapa (Cuello de Botella) ──────────────────

export interface WipEtapa {
  id: string
  nombre: string            // Nombre legible de la etapa
  responsable: string       // Quién es dueño de esta etapa
  count: number             // Incidentes activos en esta etapa ahora
  porcentaje: number        // % del total WIP
  esCuello: boolean         // Es la etapa con mayor acumulación
  esAlerta: boolean         // Supera el umbral de alerta (>40% del WIP)
  colorBarra: string        // Color Tailwind para la barra
}

export interface WipData {
  totalWip: number              // Total incidentes activos (no finalizados)
  etapas: WipEtapa[]
  cuellosIdentificados: string[]  // Nombres de etapas con alerta
  throughputRate: number | null   // Incidentes finalizados promedio por día (últimos 30d)
  tiempoCicloProyectado: number | null  // WIP / throughputRate (Ley de Little)
}

/**
 * Calcula el WIP (Work In Process) activo distribuido por etapa del proceso.
 *
 * Basado en el análisis del Cuello de Botella (Sub Shop, U1):
 * "La capacidad del proceso está determinada por la actividad con menor capacidad."
 * Aquí adaptado: la etapa con MAYOR acumulación de WIP es el cuello de botella.
 *
 * Incluye la Ley de Little: TC proyectado = WIP / Throughput Rate.
 */
export async function getWipData(): Promise<WipData> {
  const supabase = createAdminClient()

  // Traer todos los incidentes activos con sus relaciones para calcular sub-estado
  const { data: activos } = await supabase
    .from('incidentes')
    .select(`
      id_incidente,
      estado_actual,
      asignaciones_tecnico (estado_asignacion),
      presupuestos (estado_presupuesto),
      conformidades (url_documento, esta_firmada, esta_rechazada),
      inspecciones (id_inspeccion)
    `)
    .not('estado_actual', 'in', '("finalizado","resuelto")')

  // Throughput: incidentes finalizados en los últimos 30 días
  const hace30 = new Date()
  hace30.setDate(hace30.getDate() - 30)
  const { count: finalizados30d } = await supabase
    .from('incidentes')
    .select('id_incidente', { count: 'exact', head: true })
    .eq('fue_resuelto', 1)
    .gte('fecha_cierre', hace30.toISOString().slice(0, 10))

  const throughputRate = finalizados30d && finalizados30d > 0
    ? Math.round((finalizados30d / 30) * 10) / 10   // incidentes/día con 1 decimal
    : null

  const totalWip = activos?.length ?? 0
  const tiempoCicloProyectado = throughputRate && totalWip > 0
    ? Math.round(totalWip / throughputRate)
    : null

  if (!activos?.length) {
    return { totalWip: 0, etapas: [], cuellosIdentificados: [], throughputRate, tiempoCicloProyectado: null }
  }

  // ── Clasificar cada incidente en su etapa ─────────────────────────────────
  const conteos: Record<string, number> = {
    pendiente_asignacion:      0,
    esperando_tecnico:         0,
    reasignacion_requerida:    0,
    pendiente_inspeccion:      0,
    pendiente_presupuesto:     0,
    presupuesto_esperando_admin:   0,
    presupuesto_esperando_cliente: 0,
    en_ejecucion:              0,
    conformidad_pendiente:     0,
    conformidad_rechazada:     0,
  }

  for (const inc of activos) {
    const estado = inc.estado_actual as string
    const asigs  = (inc.asignaciones_tecnico as any[]) ?? []
    const press  = (inc.presupuestos as any[]) ?? []
    const confs  = (inc.conformidades as any[]) ?? []
    const insps  = (inc.inspecciones as any[]) ?? []

    if (estado === 'pendiente') {
      conteos.pendiente_asignacion++
      continue
    }

    if (estado === 'asignacion_solicitada') {
      const tieneRechazo = asigs.some((a: any) => a.estado_asignacion === 'rechazada')
      conteos[tieneRechazo ? 'reasignacion_requerida' : 'esperando_tecnico']++
      continue
    }

    if (estado === 'en_proceso') {
      // Verificar sub-estado (misma lógica que getAccionPendiente en el cliente)
      const confRechazada = confs.some((c: any) => c.esta_rechazada === true || c.esta_rechazada === 1)
      if (confRechazada) { conteos.conformidad_rechazada++; continue }

      const confPendiente = confs.some((c: any) =>
        c.url_documento && !(c.esta_firmada === 1 || c.esta_firmada === true) && !(c.esta_rechazada === 1 || c.esta_rechazada === true)
      )
      if (confPendiente) { conteos.conformidad_pendiente++; continue }

      const presEnviado = press.some((p: any) => p.estado_presupuesto === 'enviado')
      if (presEnviado) { conteos.presupuesto_esperando_admin++; continue }

      const presAprobAdmin = press.some((p: any) => p.estado_presupuesto === 'aprobado_admin')
      if (presAprobAdmin) { conteos.presupuesto_esperando_cliente++; continue }

      const asigActiva = asigs.find((a: any) => ['aceptada', 'en_curso'].includes(a.estado_asignacion))
      const presAprobado = press.some((p: any) => p.estado_presupuesto === 'aprobado')

      if (asigActiva?.estado_asignacion === 'aceptada' && !presAprobado) {
        conteos[insps.length > 0 ? 'pendiente_presupuesto' : 'pendiente_inspeccion']++
        continue
      }

      conteos.en_ejecucion++
    }
  }

  // ── Definición de etapas con metadata ─────────────────────────────────────
  const ETAPAS_DEF: Array<{ id: string; nombre: string; responsable: string; color: string }> = [
    { id: 'pendiente_asignacion',       nombre: 'Pendiente de asignación',          responsable: 'Administración',  color: 'bg-slate-400'   },
    { id: 'esperando_tecnico',          nombre: 'Esperando respuesta del técnico',  responsable: 'Técnico',         color: 'bg-blue-400'    },
    { id: 'reasignacion_requerida',     nombre: 'Reasignación requerida',           responsable: 'Administración',  color: 'bg-orange-400'  },
    { id: 'pendiente_inspeccion',       nombre: 'Pendiente de inspección',          responsable: 'Técnico',         color: 'bg-cyan-400'    },
    { id: 'pendiente_presupuesto',      nombre: 'Elaborando presupuesto',           responsable: 'Técnico',         color: 'bg-indigo-400'  },
    { id: 'presupuesto_esperando_admin',nombre: 'Presupuesto — esperando admin',    responsable: 'Administración',  color: 'bg-amber-400'   },
    { id: 'presupuesto_esperando_cliente',nombre:'Presupuesto — esperando cliente', responsable: 'Cliente',         color: 'bg-yellow-400'  },
    { id: 'en_ejecucion',               nombre: 'Trabajo en ejecución',             responsable: 'Técnico',         color: 'bg-green-400'   },
    { id: 'conformidad_pendiente',      nombre: 'Conformidad — esperando revisión', responsable: 'Administración',  color: 'bg-purple-400'  },
    { id: 'conformidad_rechazada',      nombre: 'Conformidad rechazada',            responsable: 'Técnico',         color: 'bg-red-400'     },
  ]

  const maxCount = Math.max(...Object.values(conteos), 1)
  const umbralAlerta = Math.max(Math.round(totalWip * 0.4), 1)

  const etapas: WipEtapa[] = ETAPAS_DEF
    .filter(e => conteos[e.id] > 0)
    .map(e => ({
      id: e.id,
      nombre: e.nombre,
      responsable: e.responsable,
      count: conteos[e.id],
      porcentaje: totalWip > 0 ? Math.round((conteos[e.id] / totalWip) * 100) : 0,
      esCuello: conteos[e.id] === maxCount && maxCount > 0,
      esAlerta: conteos[e.id] >= umbralAlerta,
      colorBarra: e.color,
    }))
    .sort((a, b) => b.count - a.count)

  const cuellosIdentificados = etapas.filter(e => e.esAlerta).map(e => e.nombre)

  return {
    totalWip,
    etapas,
    cuellosIdentificados,
    throughputRate,
    tiempoCicloProyectado,
  }
}

// ─── SP2-B · Tasa de Reasignación ────────────────────────────────────────────

export interface ReasignacionPorTecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  totalAsignaciones: number
  rechazadas: number              // El técnico rechazó antes de aceptar
  canceladas: number              // El técnico canceló después de aceptar
  presupuestosRechazados: number  // El técnico presentó el presupuesto y el admin no lo aceptó
  tasaProblema: number            // (rechazadas + canceladas + presupuestosRechazados) / total × 100
  semaforo: Semaforo
}

export interface ReasignacionPorCategoria {
  categoria: string
  totalAsignados: number   // incidentes asignados en esta categoría
  conReasignacion: number  // incidentes que necesitaron más de 1 asignación
  tasa: number             // conReasignacion / totalAsignados × 100
}

export interface ReasignacionMensual {
  mes: string
  label: string
  tasa: number
  totalAsignados: number
  conReasignacion: number
}

export interface ReasignacionData {
  tasaGlobal: number | null
  semaforoGlobal: Semaforo
  totalIncidentesAsignados: number
  totalConReasignacion: number
  motivoDesglose: {
    rechazadas: number             // asignaciones en estado 'rechazada' (tech no quiso)
    canceladas: number             // asignaciones en estado 'cancelada' (tech abandonó)
    presupuestosRechazados: number // presupuesto presentado por el técnico y rechazado por admin
  }
  porTecnico: ReasignacionPorTecnico[]
  porCategoria: ReasignacionPorCategoria[]
  tendenciaMensual: ReasignacionMensual[]
}

/**
 * Calcula la Tasa de Reasignación del proceso de asignación de técnicos.
 *
 * LEAN Waste #6 — Reprocesamiento: cada reasignación es un ciclo extra de trabajo
 * que no agrega valor para el cliente. Mide qué % de incidentes necesitaron
 * más de 1 asignación para quedar atendidos.
 *
 * Desagregado por técnico (quién genera más rechazos/cancelaciones) y
 * por categoría (qué especialidades tienen problemas de cobertura).
 */
export async function getReasignacionData(): Promise<ReasignacionData> {
  const supabase = createAdminClient()

  // Traer todas las asignaciones con datos del técnico e incidente, y presupuestos rechazados
  const [{ data: asignaciones }, { data: presRechazadosRaw }] = await Promise.all([
    supabase
      .from('asignaciones_tecnico')
      .select(`
        id_asignacion,
        id_incidente,
        id_tecnico,
        estado_asignacion,
        fecha_asignacion,
        tecnicos ( nombre, apellido ),
        incidentes ( categoria, fecha_registro )
      `)
      .order('fecha_asignacion', { ascending: true }),
    supabase
      .from('presupuestos')
      .select('id_incidente')
      .eq('estado_presupuesto', 'rechazado'),
  ])

  const incidentesConPresRechazado = new Set(
    (presRechazadosRaw || []).map((p: any) => p.id_incidente as number)
  )

  if (!asignaciones?.length) {
    return {
      tasaGlobal: null,
      semaforoGlobal: 'sin_datos',
      totalIncidentesAsignados: 0,
      totalConReasignacion: 0,
      motivoDesglose: { rechazadas: 0, canceladas: 0, presupuestosRechazados: incidentesConPresRechazado.size },
      porTecnico: [],
      porCategoria: [],
      tendenciaMensual: [],
    }
  }

  // ── Agrupar asignaciones por incidente ────────────────────────────────────
  const porIncidente = new Map<number, typeof asignaciones>()
  for (const asig of asignaciones) {
    if (!porIncidente.has(asig.id_incidente)) porIncidente.set(asig.id_incidente, [])
    porIncidente.get(asig.id_incidente)!.push(asig)
  }

  const totalIncidentesAsignados = porIncidente.size
  const conReasignacion = [...porIncidente.entries()].filter(([idInc, asigs]) =>
    asigs.some(a => a.estado_asignacion === 'rechazada' || a.estado_asignacion === 'cancelada') ||
    incidentesConPresRechazado.has(idInc)
  )
  const totalConReasignacion = conReasignacion.length
  const tasaGlobal = totalIncidentesAsignados > 0
    ? Math.round((totalConReasignacion / totalIncidentesAsignados) * 100)
    : null

  const semaforoGlobal: Semaforo = tasaGlobal === null ? 'sin_datos'
    : tasaGlobal <= 10 ? 'verde'
    : tasaGlobal <= 25 ? 'amarillo'
    : 'rojo'

  // ── Desglose por motivo ────────────────────────────────────────────────────
  const rechazadas = asignaciones.filter(a => a.estado_asignacion === 'rechazada').length
  const canceladas  = asignaciones.filter(a => a.estado_asignacion === 'cancelada').length
  const presupuestosRechazados = incidentesConPresRechazado.size

  // ── Por técnico ────────────────────────────────────────────────────────────
  const tecnicoMap = new Map<number, {
    nombre: string; apellido: string
    total: number; rechazadas: number; canceladas: number; presRechazados: number
  }>()

  for (const asig of asignaciones) {
    if (!tecnicoMap.has(asig.id_tecnico)) {
      const tec = asig.tecnicos as any
      tecnicoMap.set(asig.id_tecnico, {
        nombre: tec?.nombre ?? '—',
        apellido: tec?.apellido ?? '',
        total: 0, rechazadas: 0, canceladas: 0, presRechazados: 0,
      })
    }
    const t = tecnicoMap.get(asig.id_tecnico)!
    t.total++
    if (asig.estado_asignacion === 'rechazada') t.rechazadas++
    if (asig.estado_asignacion === 'cancelada')  t.canceladas++
  }

  // Atribuir presupuestos rechazados al técnico con asignación activa en ese incidente
  for (const idInc of incidentesConPresRechazado) {
    const asigs = porIncidente.get(idInc) ?? []
    const asigActiva = asigs.find(a => !['rechazada', 'cancelada'].includes(a.estado_asignacion))
    if (asigActiva && tecnicoMap.has(asigActiva.id_tecnico)) {
      tecnicoMap.get(asigActiva.id_tecnico)!.presRechazados++
    }
  }

  const porTecnico: ReasignacionPorTecnico[] = [...tecnicoMap.entries()]
    .map(([id, t]) => {
      const tasa = t.total > 0 ? Math.round(((t.rechazadas + t.canceladas + t.presRechazados) / t.total) * 100) : 0
      return {
        id_tecnico: id,
        nombre: t.nombre,
        apellido: t.apellido,
        totalAsignaciones: t.total,
        rechazadas: t.rechazadas,
        canceladas: t.canceladas,
        presupuestosRechazados: t.presRechazados,
        tasaProblema: tasa,
        semaforo: (tasa <= 20 ? 'verde' : tasa <= 40 ? 'amarillo' : 'rojo') as Semaforo,
      }
    })
    .sort((a, b) => b.tasaProblema - a.tasaProblema)

  // ── Por categoría ──────────────────────────────────────────────────────────
  const categoriaMap = new Map<string, { total: number; conReasig: number }>()

  for (const [idInc, asigs] of porIncidente) {
    const cat = (asigs[0]?.incidentes as any)?.categoria ?? 'Sin categoría'
    if (!categoriaMap.has(cat)) categoriaMap.set(cat, { total: 0, conReasig: 0 })
    const c = categoriaMap.get(cat)!
    c.total++
    if (
      asigs.some(a => a.estado_asignacion === 'rechazada' || a.estado_asignacion === 'cancelada') ||
      incidentesConPresRechazado.has(idInc)
    ) {
      c.conReasig++
    }
  }

  const porCategoria: ReasignacionPorCategoria[] = [...categoriaMap.entries()]
    .map(([categoria, v]) => ({
      categoria,
      totalAsignados: v.total,
      conReasignacion: v.conReasig,
      tasa: v.total > 0 ? Math.round((v.conReasig / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.tasa - a.tasa)

  // ── Tendencia mensual (últimos 12 meses) ───────────────────────────────────
  const hoy = new Date()
  const mesesRef: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    mesesRef.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const tendenciaMensual: ReasignacionMensual[] = mesesRef
    .map(m => {
      // Incidentes cuya PRIMERA asignación ocurrió en este mes
      const incidentesMes = new Map<number, typeof asignaciones>()
      for (const asig of asignaciones) {
        const mesAsig = (asig.fecha_asignacion as string).slice(0, 7)
        if (mesAsig !== m) continue
        if (!incidentesMes.has(asig.id_incidente)) incidentesMes.set(asig.id_incidente, [])
        incidentesMes.get(asig.id_incidente)!.push(asig)
      }
      if (!incidentesMes.size) return null
      // Para cada incidente del mes, ver si tuvo reasignación en CUALQUIER momento
      const totalMes = incidentesMes.size
      const conReasigMes = [...incidentesMes.keys()].filter(id => {
        const todasAsigs = porIncidente.get(id) ?? []
        return (
          todasAsigs.some(a => a.estado_asignacion === 'rechazada' || a.estado_asignacion === 'cancelada') ||
          incidentesConPresRechazado.has(id)
        )
      }).length
      return {
        mes: m,
        label: mesLabel(m),
        tasa: Math.round((conReasigMes / totalMes) * 100),
        totalAsignados: totalMes,
        conReasignacion: conReasigMes,
      }
    })
    .filter(Boolean) as ReasignacionMensual[]

  return {
    tasaGlobal,
    semaforoGlobal,
    totalIncidentesAsignados,
    totalConReasignacion,
    motivoDesglose: { rechazadas, canceladas, presupuestosRechazados },
    porTecnico,
    porCategoria,
    tendenciaMensual,
  }
}

// ─── SP7 · Tasa de Conformidades Rechazadas (TCR) ────────────────────────────

export interface TcrPorTecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  totalConformidades: number
  rechazadas: number
  tasa: number
  semaforo: Semaforo
}

export interface TcrPorCategoria {
  categoria: string
  totalConformidades: number
  rechazadas: number
  tasa: number
}

export interface TcrMensual {
  mes: string
  label: string
  tasa: number
  totalConformidades: number
  rechazadas: number
}

export interface TcrData {
  tasaGlobal: number | null
  semaforoGlobal: Semaforo
  totalConformidades: number
  totalRechazadas: number
  porTecnico: TcrPorTecnico[]
  porCategoria: TcrPorCategoria[]
  tendenciaMensual: TcrMensual[]
}

/**
 * Calcula la Tasa de Conformidades Rechazadas (TCR) — SP7.
 *
 * Es el indicador de calidad técnica más directo del sistema: mide cuántas veces
 * el admin considera que el trabajo presentado no es satisfactorio.
 * Equivalente al DPMO (Defectos Por Millón de Oportunidades) de Six Sigma
 * aplicado a servicios técnicos. Cada rechazo = Waste #6 LEAN (Reprocesamiento).
 *
 * Desagregado por técnico (control de calidad individual) y por categoría
 * (identificar qué tipos de trabajo tienen más problemas de calidad).
 */
export async function getTcrData(): Promise<TcrData> {
  const supabase = createAdminClient()

  const { data: conformidades } = await supabase
    .from('conformidades')
    .select(`
      id_conformidad,
      id_incidente,
      esta_rechazada,
      fecha_creacion,
      incidentes (
        categoria,
        asignaciones_tecnico (
          id_tecnico,
          estado_asignacion,
          tecnicos ( nombre, apellido )
        )
      )
    `)
    .order('fecha_creacion', { ascending: true })

  if (!conformidades?.length) {
    return {
      tasaGlobal: null,
      semaforoGlobal: 'sin_datos',
      totalConformidades: 0,
      totalRechazadas: 0,
      porTecnico: [],
      porCategoria: [],
      tendenciaMensual: [],
    }
  }

  const total = conformidades.length
  const rechazadas = conformidades.filter(c =>
    c.esta_rechazada === true || c.esta_rechazada === 1
  ).length
  const tasaGlobal = total > 0 ? Math.round((rechazadas / total) * 100) : null

  const semaforoGlobal: Semaforo = tasaGlobal === null ? 'sin_datos'
    : tasaGlobal <= 5  ? 'verde'
    : tasaGlobal <= 15 ? 'amarillo'
    : 'rojo'

  // ── Por técnico ────────────────────────────────────────────────────────────
  const tecMap = new Map<number, {
    nombre: string; apellido: string; total: number; rechaz: number
  }>()

  for (const conf of conformidades) {
    const inc = conf.incidentes as any
    const asigs: any[] = inc?.asignaciones_tecnico ?? []
    // Técnico activo = el que tiene asignación en estado 'completada' o 'en_curso'
    const asigActiva = asigs.find((a: any) =>
      ['completada', 'en_curso', 'aceptada'].includes(a.estado_asignacion)
    )
    if (!asigActiva) continue
    const idTec = asigActiva.id_tecnico
    const tec   = asigActiva.tecnicos as any
    if (!tecMap.has(idTec)) {
      tecMap.set(idTec, {
        nombre: tec?.nombre ?? '—',
        apellido: tec?.apellido ?? '',
        total: 0, rechaz: 0,
      })
    }
    const t = tecMap.get(idTec)!
    t.total++
    if (conf.esta_rechazada === true || conf.esta_rechazada === 1) t.rechaz++
  }

  const porTecnico: TcrPorTecnico[] = [...tecMap.entries()]
    .map(([id, t]) => {
      const tasa = t.total > 0 ? Math.round((t.rechaz / t.total) * 100) : 0
      return {
        id_tecnico: id,
        nombre: t.nombre,
        apellido: t.apellido,
        totalConformidades: t.total,
        rechazadas: t.rechaz,
        tasa,
        semaforo: (tasa <= 5 ? 'verde' : tasa <= 15 ? 'amarillo' : 'rojo') as Semaforo,
      }
    })
    .sort((a, b) => b.tasa - a.tasa)

  // ── Por categoría ──────────────────────────────────────────────────────────
  const catMap = new Map<string, { total: number; rechaz: number }>()

  for (const conf of conformidades) {
    const cat = (conf.incidentes as any)?.categoria ?? 'Sin categoría'
    if (!catMap.has(cat)) catMap.set(cat, { total: 0, rechaz: 0 })
    const c = catMap.get(cat)!
    c.total++
    if (conf.esta_rechazada === true || conf.esta_rechazada === 1) c.rechaz++
  }

  const porCategoria: TcrPorCategoria[] = [...catMap.entries()]
    .map(([categoria, v]) => ({
      categoria,
      totalConformidades: v.total,
      rechazadas: v.rechaz,
      tasa: v.total > 0 ? Math.round((v.rechaz / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.tasa - a.tasa)

  // ── Tendencia mensual ──────────────────────────────────────────────────────
  const hoy = new Date()
  const mesesRef: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    mesesRef.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const tendenciaMensual: TcrMensual[] = mesesRef
    .map(m => {
      const delMes = conformidades.filter(c =>
        (c.fecha_creacion as string).slice(0, 7) === m
      )
      if (!delMes.length) return null
      const rechazMes = delMes.filter(c =>
        c.esta_rechazada === true || c.esta_rechazada === 1
      ).length
      return {
        mes: m,
        label: mesLabel(m),
        tasa: Math.round((rechazMes / delMes.length) * 100),
        totalConformidades: delMes.length,
        rechazadas: rechazMes,
      }
    })
    .filter(Boolean) as TcrMensual[]

  return {
    tasaGlobal,
    semaforoGlobal,
    totalConformidades: total,
    totalRechazadas: rechazadas,
    porTecnico,
    porCategoria,
    tendenciaMensual,
  }
}

// ─── SP8-A/B · Deuda Pendiente de Cobro (DPC) y Pago a Técnicos (DPT) ───────

export interface Sp8ItemPendiente {
  id_presupuesto: number
  id_incidente: number
  nombre: string
  apellido: string
  monto: number
  fecha_presupuesto: string
  diasPendiente: number
  tramo: '0-7' | '7-15' | '>15'
}

export interface Sp8Tramo {
  label: string
  count: number
  monto: number
}

export interface Sp8Data {
  dpcMonto: number
  dpcCount: number
  dpcSemaforo: Semaforo
  dpcPorTramo: Sp8Tramo[]
  dpcPendientes: Sp8ItemPendiente[]
  dptMonto: number
  dptCount: number
  dptSemaforo: Semaforo
  dptPorTramo: Sp8Tramo[]
  dptPendientes: Sp8ItemPendiente[]
}

function calcTramo(dias: number): '0-7' | '7-15' | '>15' {
  if (dias <= 7)  return '0-7'
  if (dias <= 15) return '7-15'
  return '>15'
}

function sp8Semaforo(count: number): Semaforo {
  if (count === 0)  return 'verde'
  if (count <= 5)   return 'amarillo'
  return 'rojo'
}

function agruparPorTramo(items: Sp8ItemPendiente[]): Sp8Tramo[] {
  const mapa: Record<string, Sp8Tramo> = {
    '0-7':  { label: '0 – 7 días',  count: 0, monto: 0 },
    '7-15': { label: '7 – 15 días', count: 0, monto: 0 },
    '>15':  { label: '> 15 días',   count: 0, monto: 0 },
  }
  for (const it of items) {
    mapa[it.tramo].count++
    mapa[it.tramo].monto += it.monto
  }
  return Object.values(mapa)
}

/**
 * Calcula la Deuda Pendiente de Cobro al Cliente (DPC) — SP8-A
 * y la Deuda Pendiente de Pago a Técnicos (DPT) — SP8-B.
 *
 * DPC = incidentes finalizados con presupuesto aprobado y sin cobro registrado.
 * DPT = presupuestos aprobados sin pago al técnico registrado.
 *
 * Aplica el concepto de Costo de Oportunidad (U1): trabajo entregado pero no
 * cobrado/pagado no genera flujo de caja real. Indicador financiero urgente.
 */
export async function getSp8Data(): Promise<Sp8Data> {
  const supabase = createAdminClient()
  const hoy = new Date()

  // ── DPC: presupuestos aprobados de incidentes finalizados sin cobro ──────────
  const { data: presupuestosFinalizados } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto, id_incidente, costo_total, fecha_creacion,
      incidentes!inner (
        estado_actual,
        id_cliente_reporta,
        clientes:id_cliente_reporta ( nombre, apellido )
      )
    `)
    .eq('estado_presupuesto', 'aprobado')
    .in('incidentes.estado_actual', ['finalizado', 'resuelto'])

  const idsFinalizados = (presupuestosFinalizados || []).map((p: any) => p.id_presupuesto)

  const { data: cobrosHechos } = idsFinalizados.length
    ? await supabase.from('cobros_clientes').select('id_presupuesto').in('id_presupuesto', idsFinalizados)
    : { data: [] }

  const cobradosSet = new Set((cobrosHechos || []).map((c: any) => c.id_presupuesto))

  const dpcPendientes: Sp8ItemPendiente[] = []
  for (const pres of (presupuestosFinalizados || [])) {
    if (cobradosSet.has(pres.id_presupuesto)) continue
    const inc = pres.incidentes as any
    const cliente = Array.isArray(inc?.clientes) ? inc.clientes[0] : inc?.clientes
    if (!cliente) continue
    const dias = Math.floor((hoy.getTime() - new Date(pres.fecha_creacion).getTime()) / 86400000)
    dpcPendientes.push({
      id_presupuesto: pres.id_presupuesto,
      id_incidente: pres.id_incidente,
      nombre: cliente.nombre ?? '',
      apellido: cliente.apellido ?? '',
      monto: Number(pres.costo_total) || 0,
      fecha_presupuesto: pres.fecha_creacion,
      diasPendiente: dias,
      tramo: calcTramo(dias),
    })
  }
  dpcPendientes.sort((a, b) => b.diasPendiente - a.diasPendiente)

  // ── DPT: presupuestos aprobados sin pago al técnico ──────────────────────────
  const { data: presupuestosAprobados } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto, id_incidente, costo_materiales, costo_mano_obra, fecha_creacion,
      incidentes!inner (
        asignaciones_tecnico (
          estado_asignacion,
          tecnicos ( id_tecnico, nombre, apellido )
        )
      )
    `)
    .eq('estado_presupuesto', 'aprobado')

  const idsAprobados = (presupuestosAprobados || []).map((p: any) => p.id_presupuesto)

  const { data: pagosHechos } = idsAprobados.length
    ? await supabase.from('pagos_tecnicos').select('id_presupuesto').in('id_presupuesto', idsAprobados)
    : { data: [] }

  const pagadosSet = new Set((pagosHechos || []).map((p: any) => p.id_presupuesto))

  const dptPendientes: Sp8ItemPendiente[] = []
  for (const pres of (presupuestosAprobados || [])) {
    if (pagadosSet.has(pres.id_presupuesto)) continue
    const inc = pres.incidentes as any
    const asigs = Array.isArray(inc?.asignaciones_tecnico) ? inc.asignaciones_tecnico : []
    const asig = asigs.find((a: any) => ['completada', 'en_curso', 'aceptada'].includes(a.estado_asignacion)) || asigs[0]
    const tec = asig?.tecnicos
    if (!tec) continue
    const mat = Number(pres.costo_materiales) || 0
    const mdo = Number(pres.costo_mano_obra) || 0
    const dias = Math.floor((hoy.getTime() - new Date(pres.fecha_creacion).getTime()) / 86400000)
    dptPendientes.push({
      id_presupuesto: pres.id_presupuesto,
      id_incidente: pres.id_incidente,
      nombre: tec.nombre ?? '',
      apellido: tec.apellido ?? '',
      monto: mat + mdo,
      fecha_presupuesto: pres.fecha_creacion,
      diasPendiente: dias,
      tramo: calcTramo(dias),
    })
  }
  dptPendientes.sort((a, b) => b.diasPendiente - a.diasPendiente)

  const dpcMonto = dpcPendientes.reduce((s, i) => s + i.monto, 0)
  const dptMonto = dptPendientes.reduce((s, i) => s + i.monto, 0)

  return {
    dpcMonto,
    dpcCount: dpcPendientes.length,
    dpcSemaforo: sp8Semaforo(dpcPendientes.length),
    dpcPorTramo: agruparPorTramo(dpcPendientes),
    dpcPendientes,
    dptMonto,
    dptCount: dptPendientes.length,
    dptSemaforo: sp8Semaforo(dptPendientes.length),
    dptPorTramo: agruparPorTramo(dptPendientes),
    dptPendientes,
  }
}

// ─── KPI-1 · Índice de Calidad del Servicio (ICS) ────────────────────────────

export interface IscPorTecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  promedio: number
  cantidad: number
  semaforo: Semaforo
}

export interface IscPorCategoria {
  categoria: string
  promedio: number
  cantidad: number
}

export interface IscMensual {
  mes: string
  label: string
  promedio: number
  cantidad: number
}

export interface IscData {
  promedioGlobal: number | null
  semaforoGlobal: Semaforo
  totalCalificaciones: number
  distribucionEstrellas: { estrellas: number; count: number; porcentaje: number }[]
  resolvioProblema: { si: number; no: number; tasa: number }
  porTecnico: IscPorTecnico[]
  porCategoria: IscPorCategoria[]
  tendenciaMensual: IscMensual[]
}

function iscSemaforo(promedio: number | null): Semaforo {
  if (promedio === null) return 'sin_datos'
  if (promedio >= 4.5)  return 'verde'
  if (promedio >= 3.5)  return 'amarillo'
  return 'rojo'
}

/**
 * Calcula el Índice de Calidad del Servicio (ICS) — KPI-1.
 *
 * Es la validación externa de todos los PPIs: mide si el cliente percibe
 * que el servicio mejoró. PPIs en verde pero ISC cayendo indica un problema
 * que los indicadores internos no capturan (trato, comunicación, expectativas).
 *
 * Desagregado por técnico (quién genera mejor experiencia), por categoría
 * (qué tipos de trabajo satisfacen más) y con tendencia mensual.
 */
export async function getIscData(): Promise<IscData> {
  const supabase = createAdminClient()

  const { data: calificaciones } = await supabase
    .from('calificaciones')
    .select(`
      id_calificacion,
      id_tecnico,
      puntuacion,
      resolvio_problema,
      fecha_calificacion,
      fecha_creacion,
      tecnicos ( id_tecnico, nombre, apellido ),
      incidentes ( categoria )
    `)
    .order('fecha_creacion', { ascending: true })

  if (!calificaciones?.length) {
    return {
      promedioGlobal: null,
      semaforoGlobal: 'sin_datos',
      totalCalificaciones: 0,
      distribucionEstrellas: [1,2,3,4,5].map(e => ({ estrellas: e, count: 0, porcentaje: 0 })),
      resolvioProblema: { si: 0, no: 0, tasa: 0 },
      porTecnico: [],
      porCategoria: [],
      tendenciaMensual: [],
    }
  }

  const total = calificaciones.length
  const sumaGlobal = calificaciones.reduce((s, c) => s + (Number(c.puntuacion) || 0), 0)
  const promedioGlobal = Math.round((sumaGlobal / total) * 10) / 10

  // Distribución de estrellas
  const distribMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const c of calificaciones) {
    const p = Math.round(Number(c.puntuacion))
    if (p >= 1 && p <= 5) distribMap[p]++
  }
  const distribucionEstrellas = [1,2,3,4,5].map(e => ({
    estrellas: e,
    count: distribMap[e],
    porcentaje: Math.round((distribMap[e] / total) * 100),
  }))

  // Resolvió el problema
  const resolvioSi = calificaciones.filter(c => c.resolvio_problema === 1 || c.resolvio_problema === true).length
  const resolvioNo = calificaciones.filter(c => c.resolvio_problema === 0 || c.resolvio_problema === false).length
  const resolvioBase = resolvioSi + resolvioNo
  const resolvioProblema = {
    si: resolvioSi,
    no: resolvioNo,
    tasa: resolvioBase > 0 ? Math.round((resolvioSi / resolvioBase) * 100) : 0,
  }

  // Por técnico
  const tecMap = new Map<number, { nombre: string; apellido: string; suma: number; count: number }>()
  for (const c of calificaciones) {
    const tec = Array.isArray(c.tecnicos) ? c.tecnicos[0] : c.tecnicos as any
    if (!tec || !c.id_tecnico) continue
    const entry = tecMap.get(c.id_tecnico) ?? { nombre: tec.nombre ?? '', apellido: tec.apellido ?? '', suma: 0, count: 0 }
    entry.suma += Number(c.puntuacion) || 0
    entry.count++
    tecMap.set(c.id_tecnico, entry)
  }
  const porTecnico: IscPorTecnico[] = [...tecMap.entries()]
    .map(([id, v]) => {
      const promedio = Math.round((v.suma / v.count) * 10) / 10
      return { id_tecnico: id, nombre: v.nombre, apellido: v.apellido, promedio, cantidad: v.count, semaforo: iscSemaforo(promedio) }
    })
    .sort((a, b) => b.promedio - a.promedio)

  // Por categoría
  const catMap = new Map<string, { suma: number; count: number }>()
  for (const c of calificaciones) {
    const inc = Array.isArray(c.incidentes) ? c.incidentes[0] : c.incidentes as any
    const cat = inc?.categoria ?? 'Sin categoría'
    const entry = catMap.get(cat) ?? { suma: 0, count: 0 }
    entry.suma += Number(c.puntuacion) || 0
    entry.count++
    catMap.set(cat, entry)
  }
  const porCategoria: IscPorCategoria[] = [...catMap.entries()]
    .map(([cat, v]) => ({ categoria: cat, promedio: Math.round((v.suma / v.count) * 10) / 10, cantidad: v.count }))
    .sort((a, b) => b.promedio - a.promedio)

  // Tendencia mensual (12 meses)
  const hoy = new Date()
  const mesLabel = (m: string) => {
    const [y, mo] = m.split('-').map(Number)
    return new Date(y, mo - 1, 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
  }
  const mesesRef: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    mesesRef.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const tendenciaMensual: IscMensual[] = mesesRef
    .map(m => {
      const delMes = calificaciones.filter(c =>
        ((c.fecha_calificacion ?? c.fecha_creacion) as string).slice(0, 7) === m
      )
      if (!delMes.length) return null
      const suma = delMes.reduce((s, c) => s + (Number(c.puntuacion) || 0), 0)
      return { mes: m, label: mesLabel(m), promedio: Math.round((suma / delMes.length) * 10) / 10, cantidad: delMes.length }
    })
    .filter(Boolean) as IscMensual[]

  return {
    promedioGlobal,
    semaforoGlobal: iscSemaforo(promedioGlobal),
    totalCalificaciones: total,
    distribucionEstrellas,
    resolvioProblema,
    porTecnico,
    porCategoria,
    tendenciaMensual,
  }
}

// ─── CB-2 · Takt Time del Sistema vs Throughput Rate ─────────────────────────

export interface Cb2Semana {
  label: string
  nuevos: number
  finalizados: number
  ratio: number
}

export interface Cb2Data {
  taktTime: number
  throughputRate: number
  ratioAbsorcion: number
  semaforoRatio: Semaforo
  totalNuevos30d: number
  totalFinalizados30d: number
  wipActual: number
  tcProyectado: number | null
  tendenciaSemanal: Cb2Semana[]
}

/**
 * Calcula el Takt Time del Sistema vs Throughput Rate — CB-2.
 *
 * Concepto LEAN (U3): Takt Time = ritmo de la demanda. Si el sistema
 * resuelve más lento de lo que entran incidentes, la cola crece de forma
 * matemáticamente inevitable. El Ratio de Absorción cuantifica exactamente
 * esa brecha. La Ley de Little (TC = WIP / Throughput) permite proyectar
 * el tiempo de ciclo a partir del WIP actual.
 */
export async function getCb2Data(): Promise<Cb2Data> {
  const supabase = createAdminClient()
  const hoy = new Date()
  const hace30 = new Date(hoy.getTime() - 30 * 86400000).toISOString()

  const { data: todos } = await supabase
    .from('incidentes')
    .select('id_incidente, estado_actual, fecha_registro, fecha_cierre, fue_resuelto')
    .order('fecha_registro', { ascending: true })

  if (!todos?.length) {
    return {
      taktTime: 0, throughputRate: 0, ratioAbsorcion: 0,
      semaforoRatio: 'sin_datos', totalNuevos30d: 0, totalFinalizados30d: 0,
      wipActual: 0, tcProyectado: null, tendenciaSemanal: [],
    }
  }

  const nuevos30d   = todos.filter(i => i.fecha_registro >= hace30)
  const finalizados30d = todos.filter(i =>
    (i.fue_resuelto === 1 || i.fue_resuelto === true || i.estado_actual === 'finalizado' || i.estado_actual === 'resuelto') &&
    i.fecha_cierre && i.fecha_cierre >= hace30
  )

  // Usar conteos enteros para el ratio — no los valores redondeados para display,
  // porque con volúmenes bajos (ej: 1/30 = 0.03) el redondeo a 1 decimal produce 0.0
  // y el ratio resultante sería incorrecto (0% en vez de 25%).
  const taktTime       = Math.round((nuevos30d.length    / 30) * 10) / 10
  const throughputRate = Math.round((finalizados30d.length / 30) * 10) / 10
  const ratioAbsorcion = nuevos30d.length > 0
    ? Math.round((finalizados30d.length / nuevos30d.length) * 100)
    : 0
  const semaforoRatio: Semaforo =
    nuevos30d.length === 0      ? 'sin_datos' :
    ratioAbsorcion > 100        ? 'verde' :
    ratioAbsorcion >= 85        ? 'amarillo' : 'rojo'

  const wipActual = todos.filter(i =>
    i.estado_actual !== 'finalizado' && i.estado_actual !== 'resuelto'
  ).length
  // TC proyectado usa también el conteo entero para evitar división por 0.0 redondeado
  const tcProyectado = finalizados30d.length > 0
    ? Math.round(wipActual / (finalizados30d.length / 30))
    : null

  // Tendencia semanal últimas 8 semanas
  const tendenciaSemanal: Cb2Semana[] = []
  for (let w = 7; w >= 0; w--) {
    const inicio = new Date(hoy.getTime() - (w + 1) * 7 * 86400000)
    const fin    = new Date(hoy.getTime() - w * 7 * 86400000)
    const isoInicio = inicio.toISOString()
    const isoFin    = fin.toISOString()
    const label = `${inicio.getDate()}/${inicio.getMonth() + 1}`
    const nv = todos.filter(i => i.fecha_registro >= isoInicio && i.fecha_registro < isoFin).length
    const fi = todos.filter(i =>
      (i.fue_resuelto === 1 || i.fue_resuelto === true || i.estado_actual === 'finalizado' || i.estado_actual === 'resuelto') &&
      i.fecha_cierre && i.fecha_cierre >= isoInicio && i.fecha_cierre < isoFin
    ).length
    const ratio = nv > 0 ? Math.round((fi / nv) * 100) : 0
    tendenciaSemanal.push({ label, nuevos: nv, finalizados: fi, ratio })
  }

  return {
    taktTime,
    throughputRate,
    ratioAbsorcion,
    semaforoRatio,
    totalNuevos30d: nuevos30d.length,
    totalFinalizados30d: finalizados30d.length,
    wipActual,
    tcProyectado,
    tendenciaSemanal,
  }
}

// ─── OEE-1 · Índice de Rendimiento del Técnico (IRT) ─────────────────────────

export interface IrtTecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  disponibilidad: number
  eficiencia: number
  eficienciaVerificada: boolean
  calidad: number
  calidadVerificada: boolean
  irt: number
  semaforo: Semaforo
  totalAsignaciones: number
  totalTrabajos: number
  totalConformidades: number
}

export interface OeeData {
  promedioIrt: number | null
  semaforoGlobal: Semaforo
  porTecnico: IrtTecnico[]
}

/**
 * Calcula el Índice de Rendimiento del Técnico (IRT) — OEE-1.
 *
 * Transpone el marco OEE (Overall Equipment Effectiveness) de manufactura
 * al capital humano técnico: IRT = Disponibilidad × Eficiencia × Calidad.
 * Permite comparar técnicos con un único índice compuesto sin que un factor
 * aislado enmascare debilidades en otro.
 *
 * - Disponibilidad: responde al sistema cuando es asignado
 * - Eficiencia: completa trabajos dentro del tiempo promedio de su categoría
 * - Calidad: conformidades aprobadas sin rechazo (FPY individual)
 */
export async function getOeeData(): Promise<OeeData> {
  const supabase = createAdminClient()

  const [asigRes, incRes, confRes] = await Promise.all([
    supabase.from('asignaciones_tecnico')
      .select('id_asignacion, id_tecnico, id_incidente, estado_asignacion, tecnicos (nombre, apellido)'),
    supabase.from('incidentes')
      .select('id_incidente, categoria, fecha_registro, fecha_cierre, asignaciones_tecnico(id_tecnico, estado_asignacion)')
      .eq('fue_resuelto', 1)
      .not('fecha_cierre', 'is', null),
    supabase.from('conformidades')
      .select(`
        id_incidente, esta_rechazada,
        incidentes ( asignaciones_tecnico ( id_tecnico, estado_asignacion ) )
      `),
  ])

  const asignaciones  = (asigRes.data  || []) as any[]
  const incCompletados = (incRes.data  || []) as any[]
  const conformidades  = (confRes.data || []) as any[]

  if (!asignaciones.length) {
    return { promedioIrt: null, semaforoGlobal: 'sin_datos', porTecnico: [] }
  }

  // ── Mapa de técnicos ─────────────────────────────────────────────────────────
  const tecInfoMap = new Map<number, { nombre: string; apellido: string }>()
  for (const a of asignaciones) {
    if (!tecInfoMap.has(a.id_tecnico)) {
      const tec = Array.isArray(a.tecnicos) ? a.tecnicos[0] : a.tecnicos
      tecInfoMap.set(a.id_tecnico, { nombre: tec?.nombre ?? '', apellido: tec?.apellido ?? '' })
    }
  }

  // ── Disponibilidad: asignaciones respondidas / total ─────────────────────────
  const asigPorTec = new Map<number, { total: number; respondidas: number }>()
  for (const a of asignaciones) {
    const entry = asigPorTec.get(a.id_tecnico) ?? { total: 0, respondidas: 0 }
    entry.total++
    if (a.estado_asignacion !== 'pendiente') entry.respondidas++
    asigPorTec.set(a.id_tecnico, entry)
  }

  // ── Eficiencia: completó en ≤ promedio de su categoría ──────────────────────
  const catTiempos = new Map<string, number[]>()
  for (const inc of incCompletados) {
    const dias = Math.floor((new Date(inc.fecha_cierre).getTime() - new Date(inc.fecha_registro).getTime()) / 86400000)
    if (!catTiempos.has(inc.categoria)) catTiempos.set(inc.categoria, [])
    catTiempos.get(inc.categoria)!.push(dias)
  }
  const catAvg = new Map<string, number>()
  for (const [cat, ts] of catTiempos.entries()) {
    catAvg.set(cat, ts.reduce((s, t) => s + t, 0) / ts.length)
  }

  const incPorTec = new Map<number, { enTiempo: number; total: number }>()
  for (const inc of incCompletados) {
    const asigs = Array.isArray(inc.asignaciones_tecnico) ? inc.asignaciones_tecnico : []
    const resp = asigs.find((a: any) => ['completada', 'aceptada', 'en_curso'].includes(a.estado_asignacion)) || asigs[0]
    if (!resp?.id_tecnico) continue
    const dias = Math.floor((new Date(inc.fecha_cierre).getTime() - new Date(inc.fecha_registro).getTime()) / 86400000)
    const avg = catAvg.get(inc.categoria) ?? Infinity
    const entry = incPorTec.get(resp.id_tecnico) ?? { enTiempo: 0, total: 0 }
    entry.total++
    if (dias <= avg) entry.enTiempo++
    incPorTec.set(resp.id_tecnico, entry)
  }

  // ── Calidad: conformidades sin rechazo / total ────────────────────────────────
  const confPorTec = new Map<number, { total: number; rechazadas: number }>()
  for (const conf of conformidades) {
    const inc = conf.incidentes as any
    const asigs = Array.isArray(inc?.asignaciones_tecnico) ? inc.asignaciones_tecnico : []
    const resp = asigs.find((a: any) => ['completada', 'aceptada', 'en_curso'].includes(a.estado_asignacion)) || asigs[0]
    if (!resp?.id_tecnico) continue
    const entry = confPorTec.get(resp.id_tecnico) ?? { total: 0, rechazadas: 0 }
    entry.total++
    if (conf.esta_rechazada === true || conf.esta_rechazada === 1) entry.rechazadas++
    confPorTec.set(resp.id_tecnico, entry)
  }

  // ── Calcular IRT por técnico ──────────────────────────────────────────────────
  const porTecnico: IrtTecnico[] = []
  for (const [id, info] of tecInfoMap.entries()) {
    const asig  = asigPorTec.get(id)
    if (!asig || asig.total === 0) continue

    const disponibilidad = Math.round((asig.respondidas / asig.total) * 100)

    const trabajos = incPorTec.get(id)
    const eficienciaVerificada = !!trabajos && trabajos.total > 0
    const eficiencia = eficienciaVerificada ? Math.round((trabajos!.enTiempo / trabajos!.total) * 100) : 100

    const conf = confPorTec.get(id)
    const calidadVerificada = !!conf && conf.total > 0
    const calidad = calidadVerificada ? Math.round(((conf!.total - conf!.rechazadas) / conf!.total) * 100) : 100

    const irt = Math.round((disponibilidad / 100) * (eficiencia / 100) * (calidad / 100) * 100)
    const semaforo: Semaforo = irt > 75 ? 'verde' : irt >= 55 ? 'amarillo' : 'rojo'

    porTecnico.push({
      id_tecnico: id,
      nombre: info.nombre,
      apellido: info.apellido,
      disponibilidad,
      eficiencia,
      eficienciaVerificada,
      calidad,
      calidadVerificada,
      irt,
      semaforo,
      totalAsignaciones: asig.total,
      totalTrabajos: trabajos?.total ?? 0,
      totalConformidades: conf?.total ?? 0,
    })
  }
  porTecnico.sort((a, b) => b.irt - a.irt)

  if (!porTecnico.length) return { promedioIrt: null, semaforoGlobal: 'sin_datos', porTecnico: [] }

  const promedioIrt = Math.round(porTecnico.reduce((s, t) => s + t.irt, 0) / porTecnico.length)
  const semaforoGlobal: Semaforo = promedioIrt > 75 ? 'verde' : promedioIrt >= 55 ? 'amarillo' : 'rojo'

  return { promedioIrt, semaforoGlobal, porTecnico }
}

// ─── SP9 · Tasa de Rechazo por Incompatibilidad de Horario ───────────────────

export interface Sp9PorTecnico {
  id_tecnico: number
  nombre:     string
  apellido:   string
  propuestas: number
  rechazadas: number
  tasa:       number
  semaforo:   Semaforo
}

export interface Sp9Data {
  tasaGlobal:       number | null
  semaforoGlobal:   Semaforo
  totalPropuestas:  number
  totalRechazadas:  number
  porTecnico:       Sp9PorTecnico[]
}

/**
 * Calcula la Tasa de Rechazo por Incompatibilidad de Horario (SP9).
 *
 * Separado de SP2-B (reasignación por rechazo/cancelación de asignación).
 * Este indicador mide específicamente cuántas veces el técnico propone una
 * visita FUERA del horario declarado por el cliente y el cliente la rechaza.
 * Un valor alto indica que los técnicos no respetan la disponibilidad del cliente.
 *
 * Semáforo: Verde < 5% | Amarillo 5–15% | Rojo > 15%
 */
export async function getSp9Data(): Promise<Sp9Data> {
  const supabase = createAdminClient()

  const { data: visitas } = await supabase
    .from('visitas')
    .select('id_tecnico, estado, tecnicos(nombre, apellido)')
    .in('estado', ['propuesta', 'confirmada', 'completada', 'rechazada'])

  if (!visitas?.length) {
    return { tasaGlobal: null, semaforoGlobal: 'sin_datos', totalPropuestas: 0, totalRechazadas: 0, porTecnico: [] }
  }

  const tecMap = new Map<number, { nombre: string; apellido: string; propuestas: number; rechazadas: number }>()

  for (const v of visitas as any[]) {
    const entry = tecMap.get(v.id_tecnico) ?? {
      nombre:    v.tecnicos?.nombre    ?? '',
      apellido:  v.tecnicos?.apellido  ?? '',
      propuestas: 0,
      rechazadas: 0,
    }
    entry.propuestas++
    if (v.estado === 'rechazada') entry.rechazadas++
    tecMap.set(v.id_tecnico, entry)
  }

  const totalPropuestas = visitas.length
  const totalRechazadas = visitas.filter((v: any) => v.estado === 'rechazada').length
  const tasaGlobal = totalPropuestas > 0 ? Math.round((totalRechazadas / totalPropuestas) * 100) : null

  const sp9Semaforo = (tasa: number | null): Semaforo =>
    tasa === null ? 'sin_datos' : tasa < 5 ? 'verde' : tasa <= 15 ? 'amarillo' : 'rojo'

  const porTecnico: Sp9PorTecnico[] = [...tecMap.entries()]
    .map(([id, v]) => {
      const tasa = v.propuestas > 0 ? Math.round((v.rechazadas / v.propuestas) * 100) : 0
      return { id_tecnico: id, ...v, tasa, semaforo: sp9Semaforo(tasa) }
    })
    .sort((a, b) => b.rechazadas - a.rechazadas)

  return {
    tasaGlobal,
    semaforoGlobal: sp9Semaforo(tasaGlobal),
    totalPropuestas,
    totalRechazadas,
    porTecnico,
  }
}

// ─── Cancelaciones por cliente ───────────────────────────────────────────────

export interface CancelacionClienteData {
  total: number
  totalIncidentes: number
  tasa: number
  semaforo: Semaforo
  ultimosMeses: { mes: string; cantidad: number }[]
}

export async function getCancelacionClienteData(): Promise<CancelacionClienteData> {
  const supabase = createAdminClient()

  const [{ count: totalCancelados }, { count: totalIncidentes }, { data: porMes }] = await Promise.all([
    supabase.from('incidentes').select('*', { count: 'exact', head: true }).eq('cancelado_por_cliente', true),
    supabase.from('incidentes').select('*', { count: 'exact', head: true }),
    supabase.from('incidentes')
      .select('fecha_registro')
      .eq('cancelado_por_cliente', true)
      .order('fecha_registro', { ascending: false })
      .limit(200),
  ])

  const total = totalCancelados ?? 0
  const totalInc = totalIncidentes ?? 0
  const tasa = totalInc > 0 ? Math.round((total / totalInc) * 100) : 0
  const semaforo: Semaforo = tasa === 0 ? 'verde' : tasa <= 5 ? 'amarillo' : 'rojo'

  // Agrupar por mes (últimos 6)
  const conteoPorMes: Record<string, number> = {}
  for (const row of porMes ?? []) {
    const mes = (row.fecha_registro as string).slice(0, 7)
    conteoPorMes[mes] = (conteoPorMes[mes] ?? 0) + 1
  }
  const ultimosMeses = Object.entries(conteoPorMes)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .reverse()
    .map(([mes, cantidad]) => ({ mes, cantidad }))

  return { total, totalIncidentes: totalInc, tasa, semaforo, ultimosMeses }
}

// ─── PPI: Disponibilidad de inspección vencida sin visita ─────────────────────

export interface DisponibilidadVencidaItem {
  id_incidente: number
  descripcion_problema: string
  fecha_registro: string
}

export interface DisponibilidadVencidaData {
  totalActivos: number
  totalHistorico: number
  tasaHistorica: number
  semaforo: Semaforo
  incidentesActivos: DisponibilidadVencidaItem[]
  ultimosMeses: { mes: string; cantidad: number }[]
}

export async function getDisponibilidadVencidaData(): Promise<DisponibilidadVencidaData> {
  const supabase = createAdminClient()

  const [
    { data: activos },
    { count: totalHistorico },
    { count: totalIncidentes },
    { data: porMes },
  ] = await Promise.all([
    supabase
      .from('incidentes')
      .select('id_incidente, descripcion_problema, fecha_registro')
      .eq('sin_visita_por_disponibilidad', true)
      .not('estado_actual', 'in', '("cancelado","finalizado","resuelto")')
      .order('fecha_registro', { ascending: false }),
    supabase
      .from('incidentes')
      .select('*', { count: 'exact', head: true })
      .eq('sin_visita_por_disponibilidad', true),
    supabase
      .from('incidentes')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('incidentes')
      .select('fecha_registro')
      .eq('sin_visita_por_disponibilidad', true)
      .order('fecha_registro', { ascending: false })
      .limit(200),
  ])

  const totalHist = totalHistorico ?? 0
  const totalInc = totalIncidentes ?? 0
  const tasaHistorica = totalInc > 0 ? Math.round((totalHist / totalInc) * 100) : 0
  const semaforo: Semaforo = totalHist === 0 ? 'verde' : tasaHistorica <= 5 ? 'amarillo' : 'rojo'

  const conteoPorMes: Record<string, number> = {}
  for (const row of porMes ?? []) {
    const mes = (row.fecha_registro as string).slice(0, 7)
    conteoPorMes[mes] = (conteoPorMes[mes] ?? 0) + 1
  }
  const ultimosMeses = Object.entries(conteoPorMes)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .reverse()
    .map(([mes, cantidad]) => ({ mes, cantidad }))

  return {
    totalActivos: (activos ?? []).length,
    totalHistorico: totalHist,
    tasaHistorica,
    semaforo,
    incidentesActivos: (activos ?? []) as DisponibilidadVencidaItem[],
    ultimosMeses,
  }
}

// ─── Export combinado de todos los PPIs ───────────────────────────────────────

export interface TodosPpisData {
  tci: TciData
  fpy: FpyData
  wip: WipData
  reasignacion: ReasignacionData
  tcr: TcrData
  sp8: Sp8Data
  isc: IscData
  cb2: Cb2Data
  oee: OeeData
  sp9: Sp9Data
  cancelacionCliente: CancelacionClienteData
  disponibilidadVencida: DisponibilidadVencidaData
}

export async function getTodosPpisData(): Promise<TodosPpisData> {
  const [tci, fpy, wip, reasignacion, tcr, sp8, isc, cb2, oee, sp9, cancelacionCliente, disponibilidadVencida] = await Promise.all([
    getTciData(),
    getFpyData(),
    getWipData(),
    getReasignacionData(),
    getTcrData(),
    getSp8Data(),
    getIscData(),
    getCb2Data(),
    getOeeData(),
    getSp9Data(),
    getCancelacionClienteData(),
    getDisponibilidadVencidaData(),
  ])
  return { tci, fpy, wip, reasignacion, tcr, sp8, isc, cb2, oee, sp9, cancelacionCliente, disponibilidadVencida }
}
