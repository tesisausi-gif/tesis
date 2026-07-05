/**
 * E2E DB — Ciclo de vida ACTUAL de un incidente + predicados de los fixes 2026-07-04.
 *
 * Reemplaza al viejo test_e2e_lifecycle.mjs, que certificaba el ciclo OBSOLETO
 * (tabla `pagos` muerta, estado 'resuelto' que nadie escribe, cobro antes de la
 * conformidad) y daba verde sin ejecutar nada real (hallazgo H3).
 *
 * Qué valida este script (contra el esquema REAL, con service key):
 *  1. El ciclo vigente: pendiente → asignacion_solicitada → en_proceso →
 *     inspección → presupuesto (enviado → aprobado_admin → aprobado) →
 *     conformidad (subida → RECHAZO → resubida → aprobada, fue_resuelto) →
 *     cobro en cobros_clientes / pago en pagos_tecnicos → finalizado.
 *  2. Los predicados corregidos, con datos que los ejercen:
 *     - conformidadVigente() sobre las 2 filas reales (rechazada + resubida).
 *     - SP8/DPC: deuda exigible visible con el filtro NUEVO e invisible con el viejo.
 *     - Adicional: original cobrado + adicional sin cobrar → sigue habiendo deuda.
 *     - getEstadoFinanciero: totalCobrado sale de cobros_clientes.
 *     - Timeline: el select aliasado sobre cobros_clientes devuelve los campos históricos.
 *  3. Cleanup completo en finally (todo dato lleva prefijo E2E).
 *
 * Correr: npm run test:db   (requiere NEXT_PUBLIC_SUPABASE_URL y
 * SUPABASE_SERVICE_ROLE_KEY; se cargan de .env.local vía dotenv)
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { conformidadVigente } from '../shared/utils/conformidades'

config({ path: new URL('../.env.local', import.meta.url).pathname })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const created: Record<string, number | null> = {
  id_cliente: null, id_inmueble: null, id_tecnico: null, id_incidente: null,
  id_asignacion: null, id_inspeccion: null,
  id_presupuesto: null, id_presupuesto_adicional: null,
  id_conformidad_rechazada: null, id_conformidad_vigente: null,
  id_cobro_original: null, id_cobro_adicional: null, id_pago_tecnico: null,
  id_calificacion: null,
}

let pasados = 0
let fallidos = 0
const ok = (paso: string, msg: string) => { pasados++; console.log(`  ✅ [${paso}] ${msg}`) }
const falla = (paso: string, msg: string, error?: unknown) => {
  fallidos++
  console.error(`  ❌ [${paso}] ${msg}`)
  if (error) console.error('     Error:', typeof error === 'object' ? JSON.stringify(error) : error)
}
const check = (paso: string, cond: boolean, msgOk: string, msgFalla: string, err?: unknown) => {
  if (cond) ok(paso, msgOk); else falla(paso, msgFalla, err)
}

// ── Setup base ────────────────────────────────────────────────────────────────

async function setupBase() {
  const { data: cli, error: e1 } = await supabase.from('clientes').insert({
    nombre: 'E2E', apellido: 'Cliente',
    correo_electronico: 'e2e.cliente.lifecycle@prueba.com', telefono: '11-9999-0001',
    dni: '00000001', esta_activo: true,
  }).select('id_cliente').single()
  if (e1 || !cli) { falla('01', 'Crear cliente', e1); return false }
  created.id_cliente = cli.id_cliente

  const { data: tipos } = await supabase.from('tipos_inmuebles').select('id_tipo_inmueble').limit(1)
  const { data: inm, error: e2 } = await supabase.from('inmuebles').insert({
    id_cliente: created.id_cliente, id_tipo_inmueble: tipos?.[0]?.id_tipo_inmueble ?? 1,
    calle: 'Calle E2E Lifecycle', altura: '123', localidad: 'Ciudad Test',
    provincia: 'Buenos Aires', esta_activo: true,
  }).select('id_inmueble').single()
  if (e2 || !inm) { falla('01', 'Crear inmueble', e2); return false }
  created.id_inmueble = inm.id_inmueble

  const { data: tec, error: e3 } = await supabase.from('tecnicos').insert({
    nombre: 'E2E', apellido: 'Tecnico',
    correo_electronico: 'e2e.tecnico.lifecycle@prueba.com', telefono: '11-9999-0002',
    dni: '00000002', especialidad: 'Plomería', esta_activo: true,
  }).select('id_tecnico').single()
  if (e3 || !tec) { falla('01', 'Crear técnico', e3); return false }
  created.id_tecnico = tec.id_tecnico

  ok('01', `Base creada: cliente=${created.id_cliente}, inmueble=${created.id_inmueble}, tecnico=${created.id_tecnico}`)
  return true
}

// ── Ciclo de vida actual ──────────────────────────────────────────────────────

async function crearIncidenteYAsignar() {
  const { data: inc, error } = await supabase.from('incidentes').insert({
    id_propiedad: created.id_inmueble, id_cliente_reporta: created.id_cliente,
    id_responsable_pago: created.id_cliente,
    descripcion_problema: 'E2E Lifecycle - Pérdida de agua en cocina',
    categoria: 'plomería', nivel_prioridad: 'alta', estado_actual: 'pendiente', fue_resuelto: 0,
  }).select('id_incidente').single()
  if (error || !inc) { falla('02', 'Crear incidente', error); return false }
  created.id_incidente = inc.id_incidente

  // Franjas de disponibilidad del cliente (flujo actual las exige)
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const { error: eF } = await supabase.from('franjas_disponibilidad').insert({
    id_incidente: created.id_incidente, fecha: manana, hora_inicio: '09:00', hora_fin: '12:00', fase: 'inspeccion',
  })
  check('02b', !eF, 'Franja de disponibilidad creada', 'Error creando franja', eF)

  // Asignación: pendiente (incidente → asignacion_solicitada) → aceptada (→ en_proceso)
  const { data: asig, error: eA } = await supabase.from('asignaciones_tecnico').insert({
    id_incidente: created.id_incidente, id_tecnico: created.id_tecnico,
    estado_asignacion: 'pendiente', fecha_asignacion: new Date().toISOString(),
  }).select('id_asignacion').single()
  if (eA || !asig) { falla('02c', 'Crear asignación', eA); return false }
  created.id_asignacion = asig.id_asignacion
  await supabase.from('incidentes').update({ estado_actual: 'asignacion_solicitada' }).eq('id_incidente', created.id_incidente)

  const { error: eAc } = await supabase.from('asignaciones_tecnico')
    .update({ estado_asignacion: 'aceptada', fecha_aceptacion: new Date().toISOString() })
    .eq('id_asignacion', created.id_asignacion)
  await supabase.from('incidentes').update({ estado_actual: 'en_proceso' }).eq('id_incidente', created.id_incidente)
  check('02d', !eAc, 'Asignación aceptada → incidente en_proceso', 'Error aceptando', eAc)
  return true
}

async function inspeccionYPresupuesto() {
  const { data: insp, error } = await supabase.from('inspecciones').insert({
    id_incidente: created.id_incidente, id_tecnico: created.id_tecnico,
    fecha_inspeccion: new Date().toISOString(),
    descripcion_inspeccion: 'E2E Lifecycle - Inspección del caño roto',
    causas_determinadas: 'Corrosión en cañería', danos_ocasionados: 'Humedad',
    requiere_materiales: 1, descripcion_materiales: 'Caño 2"', requiere_ayudantes: 0,
    dias_estimados_trabajo: 1,
  }).select('id_inspeccion').single()
  if (error || !insp) { falla('03', 'Registrar inspección', error); return false }
  created.id_inspeccion = insp.id_inspeccion

  // Presupuesto: enviado (costo crudo) → aprobado_admin (con comisión) → aprobado (cliente)
  const { data: pres, error: eP } = await supabase.from('presupuestos').insert({
    id_incidente: created.id_incidente, id_inspeccion: created.id_inspeccion,
    descripcion_detallada: 'E2E Lifecycle - Reemplazo de cañería',
    costo_materiales: 5000, costo_mano_obra: 8000, gastos_administrativos: 0, costo_total: 13000,
    estado_presupuesto: 'enviado',
  }).select('id_presupuesto').single()
  if (eP || !pres) { falla('03b', 'Crear presupuesto', eP); return false }
  created.id_presupuesto = pres.id_presupuesto

  const { error: eAdm } = await supabase.from('presupuestos')
    .update({ estado_presupuesto: 'aprobado_admin', gastos_administrativos: 2000, costo_total: 15000, fecha_aprobacion: new Date().toISOString() })
    .eq('id_presupuesto', created.id_presupuesto)
  check('03c', !eAdm, 'Presupuesto → aprobado_admin (total $15000 con comisión)', 'Error admin aprueba', eAdm)

  const { error: eCli } = await supabase.from('presupuestos')
    .update({ estado_presupuesto: 'aprobado' }).eq('id_presupuesto', created.id_presupuesto)
  check('03d', !eCli, 'Presupuesto → aprobado por cliente', 'Error cliente aprueba', eCli)
  ok('03', `Inspección=${created.id_inspeccion}, presupuesto=${created.id_presupuesto}`)
  return true
}

async function conformidadRechazoYResubida() {
  // Conformidad A: técnico sube foto → admin RECHAZA (la fila se conserva)
  const { data: confA, error } = await supabase.from('conformidades').insert({
    id_incidente: created.id_incidente, id_cliente: created.id_cliente,
    tipo_conformidad: 'final', esta_firmada: 0,
    url_documento: 'https://example.com/e2e-conformidad-borrosa.jpg',
    fecha_conformidad: new Date().toISOString(),
  }).select('id_conformidad').single()
  if (error || !confA) { falla('04', 'Subir conformidad A', error); return false }
  created.id_conformidad_rechazada = confA.id_conformidad

  const { error: eR } = await supabase.from('conformidades')
    .update({ esta_rechazada: true, fecha_rechazo: new Date().toISOString() })
    .eq('id_conformidad', confA.id_conformidad)
  check('04b', !eR, 'Conformidad A rechazada (fila conservada para historial)', 'Error rechazando', eR)

  // Conformidad B: resubida — el modelo actual INSERTA otra fila
  const { data: confB, error: eB } = await supabase.from('conformidades').insert({
    id_incidente: created.id_incidente, id_cliente: created.id_cliente,
    tipo_conformidad: 'final', esta_firmada: 0,
    url_documento: 'https://example.com/e2e-conformidad-clara.jpg',
    fecha_conformidad: new Date().toISOString(),
  }).select('id_conformidad').single()
  if (eB || !confB) { falla('04c', 'Resubir conformidad B', eB); return false }
  created.id_conformidad_vigente = confB.id_conformidad

  // PREDICADO B1/B2: hay 2 filas y la vigente es la resubida
  const { data: filas } = await supabase.from('conformidades')
    .select('id_conformidad, esta_rechazada, url_documento, esta_firmada')
    .eq('id_incidente', created.id_incidente)
  check('04d', (filas?.length ?? 0) === 2, `El incidente tiene 2 filas de conformidad (rechazo+resubida) ✓`, `Se esperaban 2 filas, hay ${filas?.length}`)
  const vigente = conformidadVigente(filas ?? [])
  check('04e', vigente?.id_conformidad === confB.id_conformidad,
    'conformidadVigente() elige la resubida (no la rechazada histórica) ✓',
    `vigente = ${vigente?.id_conformidad}, esperada ${confB.id_conformidad}`)

  // PREDICADO darDeBajaIncidente: el guard corregido ignora la rechazada
  const { data: guardBaja } = await supabase.from('conformidades')
    .select('id_conformidad').eq('id_incidente', created.id_incidente)
    .eq('esta_rechazada', false).not('url_documento', 'is', null)
  check('04f', (guardBaja?.length ?? 0) === 1,
    'Guard de baja: solo cuenta la conformidad NO rechazada ✓',
    `guard devolvió ${guardBaja?.length} filas`)

  // Admin aprueba la resubida → fue_resuelto (trabajo terminado, falta cobrar)
  const { error: eAp } = await supabase.from('conformidades')
    .update({ esta_firmada: 1, fecha_conformidad: new Date().toISOString() })
    .eq('id_conformidad', confB.id_conformidad)
  const { error: eInc } = await supabase.from('incidentes')
    .update({ fue_resuelto: 1, fecha_cierre: new Date().toISOString() })
    .eq('id_incidente', created.id_incidente)
  check('04g', !eAp && !eInc, 'Conformidad B aprobada → fue_resuelto=true (sub-estado pendiente_pago)', 'Error aprobando', eAp ?? eInc)

  // Calificación del admin al aprobar (flujo actual)
  const { data: cal } = await supabase.from('calificaciones').insert({
    id_incidente: created.id_incidente, id_tecnico: created.id_tecnico,
    puntuacion: 5, comentarios: 'E2E Lifecycle', resolvio_problema: 1,
  }).select('id_calificacion').single()
  if (cal) created.id_calificacion = cal.id_calificacion
  return true
}

// ── Predicados financieros (B4/B5/#235) ──────────────────────────────────────

async function predicadoSp8DeudaExigible() {
  // Filtro NUEVO (fix B4): aprobado + fue_resuelto + en_proceso/finalizado, sin cobro
  const { data: nuevos } = await supabase.from('presupuestos')
    .select('id_presupuesto, incidentes!inner (estado_actual, fue_resuelto)')
    .eq('estado_presupuesto', 'aprobado')
    .eq('incidentes.fue_resuelto', 1)
    .in('incidentes.estado_actual', ['en_proceso', 'finalizado'])
    .eq('id_incidente', created.id_incidente!)
  check('05a', (nuevos?.length ?? 0) === 1,
    'SP8 NUEVO: la deuda exigible ES visible (fue_resuelto + en_proceso) ✓',
    `filtro nuevo devolvió ${nuevos?.length} filas`)

  // Filtro VIEJO (el bug): exigía estado finalizado/resuelto → cero estructural
  const { data: viejos } = await supabase.from('presupuestos')
    .select('id_presupuesto, incidentes!inner (estado_actual)')
    .eq('estado_presupuesto', 'aprobado')
    .in('incidentes.estado_actual', ['finalizado', 'resuelto'])
    .eq('id_incidente', created.id_incidente!)
  check('05b', (viejos?.length ?? 0) === 0,
    'SP8 VIEJO: la misma deuda era invisible (demuestra el bug corregido) ✓',
    `el filtro viejo devolvió ${viejos?.length} filas (?)`)
  return true
}

async function adicionalYCobros() {
  // Presupuesto ADICIONAL aprobado (original + adicional conviven en 'aprobado')
  const { data: adic, error } = await supabase.from('presupuestos').insert({
    id_incidente: created.id_incidente, id_inspeccion: created.id_inspeccion,
    descripcion_detallada: 'E2E Lifecycle - Adicional: llave de paso',
    costo_materiales: 3000, costo_mano_obra: 1500, gastos_administrativos: 500, costo_total: 5000,
    estado_presupuesto: 'aprobado',
  }).select('id_presupuesto').single()
  if (error || !adic) { falla('06', 'Crear adicional aprobado', error); return false }
  created.id_presupuesto_adicional = adic.id_presupuesto

  // PREDICADO B3: 2 presupuestos 'aprobado' del mismo incidente (el caso que
  // rompía el tab Pagos con .maybeSingle()) — la lectura por lista los trae a ambos
  const { data: aprobados } = await supabase.from('presupuestos')
    .select('id_presupuesto').eq('id_incidente', created.id_incidente!).eq('estado_presupuesto', 'aprobado')
  check('06b', (aprobados?.length ?? 0) === 2,
    'Conviven 2 presupuestos aprobados (original + adicional) ✓',
    `hay ${aprobados?.length} aprobados`)

  // Cobro del ORIGINAL en cobros_clientes (tabla real; `pagos` quedó muerta)
  const { data: cobro1, error: eC1 } = await supabase.from('cobros_clientes').insert({
    id_incidente: created.id_incidente, id_presupuesto: created.id_presupuesto,
    id_cliente: created.id_cliente, monto_cobro: 15000, metodo_pago: 'transferencia',
    referencia_pago: 'E2E-COBRO-001', fecha_cobro: new Date().toISOString(),
  }).select('id_cobro').single()
  if (eC1 || !cobro1) { falla('06c', 'Registrar cobro original', eC1); return false }
  created.id_cobro_original = cobro1.id_cobro

  // Lógica de cierre (#235): quedan aprobados sin cobrar → NO finalizar
  const idsAprobados = (aprobados ?? []).map(p => p.id_presupuesto)
  const { data: cobrados } = await supabase.from('cobros_clientes')
    .select('id_presupuesto').in('id_presupuesto', idsAprobados)
  const cobradosSet = new Set((cobrados ?? []).map(c => c.id_presupuesto))
  const quedanSinCobrar = idsAprobados.some(id => !cobradosSet.has(id))
  check('06d', quedanSinCobrar === true,
    'Con el original cobrado, el adicional sigue como deuda (NO se finaliza) ✓',
    'quedanSinCobrar dio false con el adicional sin cobrar')

  // Cobro del ADICIONAL → recién ahí finaliza
  const { data: cobro2, error: eC2 } = await supabase.from('cobros_clientes').insert({
    id_incidente: created.id_incidente, id_presupuesto: created.id_presupuesto_adicional,
    id_cliente: created.id_cliente, monto_cobro: 5000, metodo_pago: 'efectivo',
    fecha_cobro: new Date().toISOString(),
  }).select('id_cobro').single()
  if (eC2 || !cobro2) { falla('06e', 'Registrar cobro adicional', eC2); return false }
  created.id_cobro_adicional = cobro2.id_cobro

  const { error: eFin } = await supabase.from('incidentes')
    .update({ estado_actual: 'finalizado' }).eq('id_incidente', created.id_incidente!)
  check('06f', !eFin, 'Todo cobrado → incidente finalizado ✓', 'Error finalizando', eFin)

  // Pago al técnico en pagos_tecnicos (egreso real)
  const { data: pagoT, error: ePT } = await supabase.from('pagos_tecnicos').insert({
    id_incidente: created.id_incidente, id_presupuesto: created.id_presupuesto,
    id_tecnico: created.id_tecnico, monto_pago: 13000, metodo_pago: 'transferencia',
    fecha_pago: new Date().toISOString(),
  }).select('id_pago_tecnico').single()
  if (ePT || !pagoT) { falla('06g', 'Registrar pago al técnico', ePT); return false }
  created.id_pago_tecnico = pagoT.id_pago_tecnico
  ok('06', 'Cobros y pago a técnico registrados en las tablas REALES')
  return true
}

async function predicadosReportes() {
  // B5 — getEstadoFinanciero: totalCobrado sale de cobros_clientes
  const { data: cobros } = await supabase.from('cobros_clientes')
    .select('monto_cobro').eq('id_incidente', created.id_incidente!)
  const total = (cobros ?? []).reduce((s, c) => s + (c.monto_cobro || 0), 0)
  check('07a', total === 20000,
    `Estado Financiero: totalCobrado=$${total} desde cobros_clientes ✓`,
    `totalCobrado=$${total}, esperado $20000`)

  // Timeline — el select aliasado devuelve los nombres históricos que consume el modal
  const { data: timeline, error } = await supabase.from('cobros_clientes')
    .select('id_pago:id_cobro, monto_pagado:monto_cobro, fecha_pago:fecha_cobro, metodo_pago, referencia_pago, observaciones')
    .eq('id_incidente', created.id_incidente!)
    .order('fecha_cobro', { ascending: true })
  const fila = (timeline ?? [])[0] as Record<string, unknown> | undefined
  check('07b', !error && !!fila && 'id_pago' in fila && 'monto_pagado' in fila && 'fecha_pago' in fila,
    'Timeline: el alias PostgREST (id_pago/monto_pagado/fecha_pago) funciona ✓',
    'El select aliasado falló', error)

  // SP8 después de cobrar todo: sin deuda
  const { data: deuda } = await supabase.from('presupuestos')
    .select('id_presupuesto, incidentes!inner (fue_resuelto, estado_actual)')
    .eq('estado_presupuesto', 'aprobado')
    .eq('incidentes.fue_resuelto', 1)
    .in('incidentes.estado_actual', ['en_proceso', 'finalizado'])
    .eq('id_incidente', created.id_incidente!)
  const idsConDeuda = (deuda ?? []).map(p => p.id_presupuesto)
  const { data: yaCobrados } = idsConDeuda.length
    ? await supabase.from('cobros_clientes').select('id_presupuesto').in('id_presupuesto', idsConDeuda)
    : { data: [] as { id_presupuesto: number }[] }
  const setCobrados = new Set((yaCobrados ?? []).map(c => c.id_presupuesto))
  const pendientes = idsConDeuda.filter(id => !setCobrados.has(id))
  check('07c', pendientes.length === 0,
    'SP8 con todo cobrado: sin deuda pendiente ✓',
    `quedaron ${pendientes.length} presupuestos como deuda`)
  return true
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup() {
  console.log('\n🧹 Limpiando datos de prueba...')
  const errs: string[] = []
  const del = async (tabla: string, campo: string, id: number | null) => {
    if (!id) return
    const { error } = await supabase.from(tabla).delete().eq(campo, id)
    if (error) errs.push(`${tabla}: ${error.message}`)
  }
  await del('calificaciones', 'id_calificacion', created.id_calificacion)
  await del('cobros_clientes', 'id_cobro', created.id_cobro_adicional)
  await del('cobros_clientes', 'id_cobro', created.id_cobro_original)
  await del('pagos_tecnicos', 'id_pago_tecnico', created.id_pago_tecnico)
  await del('conformidades', 'id_conformidad', created.id_conformidad_vigente)
  await del('conformidades', 'id_conformidad', created.id_conformidad_rechazada)
  await del('presupuestos', 'id_presupuesto', created.id_presupuesto_adicional)
  await del('presupuestos', 'id_presupuesto', created.id_presupuesto)
  await del('inspecciones', 'id_inspeccion', created.id_inspeccion)
  if (created.id_incidente) {
    await supabase.from('franjas_disponibilidad').delete().eq('id_incidente', created.id_incidente)
    await supabase.from('notificaciones').delete().eq('id_incidente', created.id_incidente)
  }
  await del('asignaciones_tecnico', 'id_asignacion', created.id_asignacion)
  await del('incidentes', 'id_incidente', created.id_incidente)
  await del('inmuebles', 'id_inmueble', created.id_inmueble)
  await del('tecnicos', 'id_tecnico', created.id_tecnico)
  await del('clientes', 'id_cliente', created.id_cliente)
  if (errs.length) console.error('  ⚠️  Errores en cleanup:', errs)
  else console.log('  ✅ Cleanup completado sin errores')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(' E2E DB — Ciclo de vida ACTUAL + predicados de fixes 2026-07-04')
  console.log('═══════════════════════════════════════════════════════════════')

  const pasos = [
    { fn: setupBase, n: 'Setup base (cliente/inmueble/técnico)' },
    { fn: crearIncidenteYAsignar, n: 'Incidente + franjas + asignación aceptada' },
    { fn: inspeccionYPresupuesto, n: 'Inspección + presupuesto enviado→aprobado' },
    { fn: conformidadRechazoYResubida, n: 'Conformidad: rechazo → resubida → aprobada (B1/B2)' },
    { fn: predicadoSp8DeudaExigible, n: 'SP8: deuda exigible visible con el filtro nuevo (B4)' },
    { fn: adicionalYCobros, n: 'Adicional + cobros reales en cobros_clientes (B3/#235)' },
    { fn: predicadosReportes, n: 'Predicados de reportes y timeline (B5)' },
  ]

  try {
    for (const paso of pasos) {
      console.log(`\n▶ ${paso.n}`)
      try { await paso.fn() }
      catch (err) { falla(paso.n, `Excepción: ${(err as Error).message}`) }
    }
  } finally {
    await cleanup()
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log(` RESULTADO: ${pasados} checks OK, ${fallidos} fallos`)
  console.log(fallidos === 0 ? ' 🎉 TODOS LOS CHECKS PASARON' : ` ⚠️  HAY ${fallidos} FALLO(S)`)
  console.log('═══════════════════════════════════════════════════════════════')
  process.exit(fallidos > 0 ? 1 : 0)
}

main().catch(async (err) => {
  console.error('Error fatal:', err)
  await cleanup()
  process.exit(1)
})
