/**
 * E2E Test - Ciclo Completo de un Incidente
 * Usa el ESQUEMA REAL de la base de datos de producción.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const created = {
  id_cliente: null, id_inmueble: null, id_tecnico: null, id_incidente: null,
  id_asignacion: null, id_inspeccion: null, id_avance1: null, id_avance2: null,
  id_presupuesto: null, id_pago: null, id_conformidad: null, id_calificacion: null,
}

let pasados = 0
let fallidos = 0

function ok(paso, msg) { pasados++; console.log(`  ✅ [${paso}] ${msg}`) }
function falla(paso, msg, error) {
  fallidos++
  console.error(`  ❌ [${paso}] ${msg}`)
  if (error) console.error(`     Error:`, typeof error === 'object' ? JSON.stringify(error) : error)
}
async function check(paso, cond, msgOk, msgFalla, err) {
  if (cond) ok(paso, msgOk); else falla(paso, msgFalla, err)
}

async function crearCliente() {
  const { data, error } = await supabase.from('clientes').insert({
    nombre: 'Test_E2E', apellido: 'Cliente_E2E',
    correo_electronico: 'test.e2e.cliente@prueba.com', telefono: '11-9999-0001',
    dni: '00000001', esta_activo: true,
  }).select('id_cliente').single()
  if (error || !data) { falla('01', 'Crear cliente', error); return false }
  created.id_cliente = data.id_cliente
  ok('01', `Cliente creado → id=${data.id_cliente}`)
  return true
}

async function crearInmueble() {
  const { data: tipos } = await supabase.from('tipos_inmuebles').select('id_tipo_inmueble').limit(1)
  const { data, error } = await supabase.from('inmuebles').insert({
    id_cliente: created.id_cliente, id_tipo_inmueble: tipos?.[0]?.id_tipo_inmueble ?? 1,
    calle: 'Calle E2E Test', altura: '123', localidad: 'Ciudad Test',
    provincia: 'Buenos Aires', esta_activo: true,
  }).select('id_inmueble').single()
  if (error || !data) { falla('02', 'Crear inmueble', error); return false }
  created.id_inmueble = data.id_inmueble
  ok('02', `Inmueble creado → id=${data.id_inmueble}`)
  return true
}

async function crearTecnico() {
  const { data, error } = await supabase.from('tecnicos').insert({
    nombre: 'Test_E2E', apellido: 'Tecnico_E2E',
    correo_electronico: 'test.e2e.tecnico@prueba.com', telefono: '11-9999-0002',
    dni: '00000002', especialidad: 'Plomería', esta_activo: true,
  }).select('id_tecnico').single()
  if (error || !data) { falla('03', 'Crear técnico', error); return false }
  created.id_tecnico = data.id_tecnico
  ok('03', `Técnico creado → id=${data.id_tecnico}`)
  return true
}

async function crearIncidente() {
  // fue_resuelto es INTEGER en DB (0/1), no BOOLEAN
  const { data, error } = await supabase.from('incidentes').insert({
    id_propiedad: created.id_inmueble, id_cliente_reporta: created.id_cliente,
    id_responsable_pago: created.id_cliente,
    descripcion_problema: 'E2E Test - Pérdida de agua en cocina',
    categoria: 'plomería', nivel_prioridad: 'alta', estado_actual: 'pendiente', fue_resuelto: 0,
  }).select('id_incidente').single()
  if (error || !data) { falla('04', 'Crear incidente', error); return false }
  created.id_incidente = data.id_incidente
  ok('04', `Incidente creado → id=${data.id_incidente}, estado=pendiente`)
  return true
}

async function asignarTecnico() {
  const { data, error } = await supabase.from('asignaciones_tecnico').insert({
    id_incidente: created.id_incidente, id_tecnico: created.id_tecnico,
    estado_asignacion: 'pendiente', fecha_asignacion: new Date().toISOString(),
    fecha_visita_programada: new Date(Date.now() + 86400000).toISOString(),
  }).select('id_asignacion').single()
  if (error || !data) { falla('05', 'Asignar técnico', error); return false }
  created.id_asignacion = data.id_asignacion
  ok('05', `Asignación creada → id=${data.id_asignacion}`)
  const { error: e2 } = await supabase.from('incidentes')
    .update({ estado_actual: 'en_proceso' }).eq('id_incidente', created.id_incidente)
  await check('05b', !e2, 'Incidente → en_proceso', 'Error actualizando estado', e2)
  return true
}

async function aceptarAsignacion() {
  const { error } = await supabase.from('asignaciones_tecnico')
    .update({ estado_asignacion: 'aceptada', fecha_aceptacion: new Date().toISOString() })
    .eq('id_asignacion', created.id_asignacion)
  await check('06', !error, 'Asignación → aceptada', 'Error aceptando', error)
  return !error
}

async function registrarInspeccion() {
  // Esquema real: causas_determinadas, danos_ocasionados, requiere_materiales, etc.
  const { data, error } = await supabase.from('inspecciones').insert({
    id_incidente: created.id_incidente, id_tecnico: created.id_tecnico,
    fecha_inspeccion: new Date().toISOString(),
    descripcion_inspeccion: 'E2E Test - Inspección inicial del caño roto',
    causas_determinadas: 'Corrosión en cañería principal bajo mesada',
    danos_ocasionados: 'Humedad en mueble inferior de cocina',
    requiere_materiales: 1,   // INTEGER en DB (no boolean)
    descripcion_materiales: 'Caño 2 pulgadas x 2m, sellador epoxi',
    requiere_ayudantes: 0,    // INTEGER
    dias_estimados_trabajo: 1,
  }).select('id_inspeccion').single()
  if (error || !data) { falla('07', 'Registrar inspección', error); return false }
  created.id_inspeccion = data.id_inspeccion
  ok('07', `Inspección registrada → id=${data.id_inspeccion}`)
  return true
}

async function avanceInicial() {
  // Esquema real: descripcion_avance (no descripcion), porcentaje_completado (no porcentaje_avance)
  const { data, error } = await supabase.from('avances_reparacion').insert({
    id_incidente: created.id_incidente, id_tecnico: created.id_tecnico,
    descripcion_avance: 'E2E Test - Desmontaje y diagnóstico completado',
    porcentaje_completado: 20, requiere_nueva_etapa: 0,  // INTEGER
  }).select('id_avance').single()
  if (error || !data) { falla('08', 'Avance 20%', error); return false }
  created.id_avance1 = data.id_avance
  ok('08', `Avance inicial → id=${data.id_avance}, porcentaje_completado=20`)
  return true
}

async function crearPresupuesto() {
  // Esquema real: id_inspeccion (no id_tecnico), descripcion_detallada, costo_materiales/mano_obra
  const { data, error } = await supabase.from('presupuestos').insert({
    id_incidente: created.id_incidente, id_inspeccion: created.id_inspeccion,
    descripcion_detallada: 'E2E Test - Reemplazo de cañería de cocina',
    costo_materiales: 5000, costo_mano_obra: 8000, gastos_administrativos: 2000, costo_total: 15000,
    estado_presupuesto: 'enviado',
    alternativas_reparacion: 'Reparación temporal con clamp de emergencia',
  }).select('id_presupuesto').single()
  if (error || !data) { falla('09', 'Crear presupuesto', error); return false }
  created.id_presupuesto = data.id_presupuesto
  ok('09', `Presupuesto creado → id=${data.id_presupuesto}, costo_total=$15000`)
  return true
}

async function adminApruebaPresupuesto() {
  const { error } = await supabase.from('presupuestos')
    .update({ estado_presupuesto: 'aprobado_admin', fecha_aprobacion: new Date().toISOString() })
    .eq('id_presupuesto', created.id_presupuesto)
  await check('10', !error, 'Presupuesto → aprobado_admin', 'Error admin aprueba', error)
  return !error
}

async function clienteApruebaPresupuesto() {
  const { error } = await supabase.from('presupuestos')
    .update({ estado_presupuesto: 'aprobado' }).eq('id_presupuesto', created.id_presupuesto)
  await check('11', !error, 'Presupuesto → aprobado', 'Error cliente aprueba', error)
  return !error
}

async function registrarPago() {
  // Esquema real: id_incidente + id_presupuesto, monto_pagado, numero_comprobante
  const { data, error } = await supabase.from('pagos').insert({
    id_incidente: created.id_incidente, id_presupuesto: created.id_presupuesto,
    monto_pagado: 15000, tipo_pago: 'total', metodo_pago: 'transferencia',
    numero_comprobante: 'E2E-TEST-001', fecha_pago: new Date().toISOString(),
    observaciones: 'Pago E2E Test',
  }).select('id_pago').single()
  if (error || !data) { falla('12', 'Registrar pago', error); return false }
  created.id_pago = data.id_pago
  ok('12', `Pago registrado → id=${data.id_pago}, monto_pagado=$15000`)
  return true
}

async function avanceFinal() {
  const { data, error } = await supabase.from('avances_reparacion').insert({
    id_incidente: created.id_incidente, id_tecnico: created.id_tecnico,
    descripcion_avance: 'E2E Test - Reparación completada. Sin fugas.',
    porcentaje_completado: 100, requiere_nueva_etapa: 0,  // INTEGER
  }).select('id_avance').single()
  if (error || !data) { falla('13', 'Avance 100%', error); return false }
  created.id_avance2 = data.id_avance
  const { error: e2 } = await supabase.from('asignaciones_tecnico')
    .update({ estado_asignacion: 'completada' }).eq('id_asignacion', created.id_asignacion)
  await check('13b', !e2, 'Asignación → completada', 'Error completando asignación', e2)
  ok('13', `Avance final → id=${data.id_avance}, porcentaje_completado=100`)
  return true
}

async function cerrarIncidente() {
  // fue_resuelto = 1 (INTEGER)
  const { error } = await supabase.from('incidentes')
    .update({ estado_actual: 'resuelto', fue_resuelto: 1, fecha_cierre: new Date().toISOString() })
    .eq('id_incidente', created.id_incidente)
  await check('14', !error, 'Incidente → resuelto, fue_resuelto=1', 'Error cerrando', error)
  return !error
}

async function crearConformidad() {
  // Esquema real: tipo_conformidad (no descripcion_trabajo), fecha_conformidad (no fecha_firma)
  const { data, error } = await supabase.from('conformidades').insert({
    id_incidente: created.id_incidente, id_cliente: created.id_cliente,
    tipo_conformidad: 'final', esta_firmada: 0,  // INTEGER
    observaciones: 'E2E Test - Trabajo según presupuesto aprobado',
  }).select('id_conformidad').single()
  if (error || !data) { falla('15', 'Crear conformidad', error); return false }
  created.id_conformidad = data.id_conformidad
  ok('15', `Conformidad creada → id=${data.id_conformidad}`)
  return true
}

async function firmarConformidad() {
  const { error } = await supabase.from('conformidades')
    .update({ esta_firmada: 1, fecha_conformidad: new Date().toISOString() })  // INTEGER
    .eq('id_conformidad', created.id_conformidad)
  await check('16', !error, 'Conformidad firmada → esta_firmada=true', 'Error firmando', error)
  return !error
}

async function calificarTecnico() {
  // Esquema real: tipo_calificacion, puntuacion (no estrellas), comentarios (no comentario), resolvio_problema
  const { data, error } = await supabase.from('calificaciones').insert({
    id_incidente: created.id_incidente, id_tecnico: created.id_tecnico,
    puntuacion: 5,
    comentarios: 'E2E Test - Excelente técnico, muy puntual y prolijo.',
    resolvio_problema: 1,  // INTEGER (tipo_calificacion omitido - acepta NULL)
  }).select('id_calificacion').single()
  if (error || !data) { falla('17', 'Calificar técnico', error); return false }
  created.id_calificacion = data.id_calificacion
  ok('17', `Calificación → id=${data.id_calificacion}, puntuacion=5`)
  return true
}

async function verificarEstadoFinal() {
  const [inc, asig, pres, pago, conf, calc] = await Promise.all([
    supabase.from('incidentes').select('estado_actual,fue_resuelto,fecha_cierre').eq('id_incidente', created.id_incidente).single(),
    supabase.from('asignaciones_tecnico').select('estado_asignacion').eq('id_asignacion', created.id_asignacion).single(),
    supabase.from('presupuestos').select('estado_presupuesto,costo_total').eq('id_presupuesto', created.id_presupuesto).single(),
    supabase.from('pagos').select('monto_pagado,tipo_pago').eq('id_pago', created.id_pago).single(),
    supabase.from('conformidades').select('esta_firmada').eq('id_conformidad', created.id_conformidad).single(),
    supabase.from('calificaciones').select('puntuacion,resolvio_problema').eq('id_calificacion', created.id_calificacion).single(),
  ])

  const i = inc.data; const a = asig.data; const p = pres.data
  const pg = pago.data; const c = conf.data; const cal = calc.data

  console.log('\n  📊 Estado final:')
  console.log(`     incidente: estado=${i?.estado_actual}, fue_resuelto=${i?.fue_resuelto}, cierre=${i?.fecha_cierre ? 'sí' : 'no'}`)
  console.log(`     asignacion: estado=${a?.estado_asignacion}`)
  console.log(`     presupuesto: estado=${p?.estado_presupuesto}, total=$${p?.costo_total}`)
  console.log(`     pago: monto=$${pg?.monto_pagado}, tipo=${pg?.tipo_pago}`)
  console.log(`     conformidad: firmada=${c?.esta_firmada}`)
  console.log(`     calificacion: puntuacion=${cal?.puntuacion}, resolvio=${cal?.resolvio_problema}`)

  await check('18a', i?.estado_actual === 'resuelto', 'incidente.estado = resuelto ✓', `incidente.estado = ${i?.estado_actual}`)
  await check('18b', i?.fue_resuelto == 1, 'incidente.fue_resuelto = 1 ✓', `fue_resuelto = ${i?.fue_resuelto}`)
  await check('18c', a?.estado_asignacion === 'completada', 'asignacion = completada ✓', `asignacion = ${a?.estado_asignacion}`)
  await check('18d', p?.estado_presupuesto === 'aprobado', 'presupuesto = aprobado ✓', `presupuesto = ${p?.estado_presupuesto}`)
  await check('18e', c?.esta_firmada == 1, 'conformidad.firmada = 1 ✓', `firmada = ${c?.esta_firmada}`)
  await check('18f', cal?.puntuacion === 5, 'calificacion.puntuacion = 5 ✓', `puntuacion = ${cal?.puntuacion}`)
  await check('18g', pg?.monto_pagado === 15000, 'pago.monto_pagado = 15000 ✓', `monto = ${pg?.monto_pagado}`)
}

async function cleanup() {
  console.log('\n🧹 Limpiando datos de prueba...')
  const errs = []
  const del = async (tabla, campo, id) => {
    if (!id) return
    const { error } = await supabase.from(tabla).delete().eq(campo, id)
    if (error) errs.push(`${tabla}: ${error.message}`)
    else console.log(`  🗑️  ${tabla} id=${id} eliminado`)
  }
  await del('calificaciones', 'id_calificacion', created.id_calificacion)
  await del('conformidades', 'id_conformidad', created.id_conformidad)
  await del('pagos', 'id_pago', created.id_pago)
  await del('presupuestos', 'id_presupuesto', created.id_presupuesto)
  await del('avances_reparacion', 'id_avance', created.id_avance2)
  await del('avances_reparacion', 'id_avance', created.id_avance1)
  await del('inspecciones', 'id_inspeccion', created.id_inspeccion)
  await del('asignaciones_tecnico', 'id_asignacion', created.id_asignacion)
  await del('incidentes', 'id_incidente', created.id_incidente)
  await del('inmuebles', 'id_inmueble', created.id_inmueble)
  await del('tecnicos', 'id_tecnico', created.id_tecnico)
  await del('clientes', 'id_cliente', created.id_cliente)
  if (errs.length) console.error('\n  ⚠️  Errores en cleanup:', errs)
  else console.log('\n  ✅ Cleanup completado sin errores')
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log(' E2E TEST - Ciclo Completo de Incidente (esquema real DB)')
  console.log('═══════════════════════════════════════════════════════════\n')

  const pasos = [
    { fn: crearCliente, n: 'Crear cliente' },
    { fn: crearInmueble, n: 'Crear inmueble' },
    { fn: crearTecnico, n: 'Crear técnico' },
    { fn: crearIncidente, n: 'Crear incidente' },
    { fn: asignarTecnico, n: 'Asignar técnico' },
    { fn: aceptarAsignacion, n: 'Aceptar asignación' },
    { fn: registrarInspeccion, n: 'Registrar inspección' },
    { fn: avanceInicial, n: 'Avance 20%' },
    { fn: crearPresupuesto, n: 'Crear presupuesto' },
    { fn: adminApruebaPresupuesto, n: 'Admin aprueba presupuesto' },
    { fn: clienteApruebaPresupuesto, n: 'Cliente aprueba presupuesto' },
    { fn: registrarPago, n: 'Registrar pago' },
    { fn: avanceFinal, n: 'Avance 100%' },
    { fn: cerrarIncidente, n: 'Cerrar incidente' },
    { fn: crearConformidad, n: 'Crear conformidad' },
    { fn: firmarConformidad, n: 'Firmar conformidad' },
    { fn: calificarTecnico, n: 'Calificar técnico' },
    { fn: verificarEstadoFinal, n: 'Verificar estado final' },
  ]

  for (const paso of pasos) {
    console.log(`\n▶ ${paso.n}`)
    try { await paso.fn() }
    catch (err) { falla(paso.n, `Excepción: ${err.message}`, err.stack?.split('\n')[1]) }
  }

  await cleanup()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log(` RESULTADO: ${pasados} pasos OK, ${fallidos} fallos`)
  if (fallidos === 0) console.log(' 🎉 TODOS LOS PASOS PASARON')
  else console.log(` ⚠️  HAY ${fallidos} FALLO(S) - Ver logs arriba`)
  console.log('═══════════════════════════════════════════════════════════')
  process.exit(fallidos > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Error fatal:', err)
  cleanup().finally(() => process.exit(1))
})
