'use server'

/**
 * Servicio de Exportación de Reportes
 * Obtiene datos del sistema para exportar en CSV o PDF
 */

import type { FilaIncidenteExport, FilaPagoExport, FilaTecnicoExport } from './exportar.types'

export async function getIncidentesParaExportar(): Promise<FilaIncidenteExport[]> {
  const { createAdminClient } = await import('@/shared/lib/supabase/admin')
  const supabase = createAdminClient()

  const { data, error } = await supabase
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

export async function getPagosParaExportar(): Promise<FilaPagoExport[]> {
  const { createAdminClient } = await import('@/shared/lib/supabase/admin')
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('pagos')
    .select(`
      id_pago,
      fecha_pago,
      monto_pagado,
      tipo_pago,
      metodo_pago,
      numero_comprobante,
      incidentes (id_incidente, descripcion_problema),
      clientes (nombre, apellido)
    `)
    .order('fecha_pago', { ascending: false })

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
    cliente_nombre: row.clientes?.nombre ?? '',
    cliente_apellido: row.clientes?.apellido ?? '',
  }))
}

export async function getTecnicosParaExportar(): Promise<FilaTecnicoExport[]> {
  const { createAdminClient } = await import('@/shared/lib/supabase/admin')
  const supabase = createAdminClient()

  const [tecnicosRes, asignacionesRes] = await Promise.all([
    supabase
      .from('tecnicos')
      .select('nombre, apellido, especialidad, correo_electronico, telefono')
      .eq('esta_activo', true),
    supabase
      .from('asignaciones_tecnico')
      .select('estado_asignacion, tecnicos(nombre, apellido)'),
  ])

  const tecnicos = tecnicosRes.data || []
  const asignaciones = asignacionesRes.data || []

  return tecnicos.map((tec: any) => {
    const propias = asignaciones.filter((a: any) => {
      const t = Array.isArray(a.tecnicos) ? a.tecnicos[0] : a.tecnicos
      return t?.nombre === tec.nombre && t?.apellido === tec.apellido
    })
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
