/**
 * Servicio de Incidentes
 * Centraliza todas las queries relacionadas con incidentes
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Tipos
export interface Incidente {
  id_incidente: number
  descripcion_problema: string
  categoria: string | null
  nivel_prioridad: string | null
  estado_actual: string
  fecha_registro: string
  fecha_cierre: string | null
  fue_resuelto: boolean
  disponibilidad: string | null
  id_propiedad: number
  id_cliente_reporta: number
  inmuebles?: {
    calle: string | null
    altura: string | null
    piso: string | null
    dpto: string | null
    barrio: string | null
    localidad: string | null
  } | null
  clientes?: {
    nombre: string
    apellido: string
    telefono: string | null
  } | null
}

export interface IncidenteConDetalles extends Incidente {
  asignaciones_tecnico?: {
    id_asignacion: number
    estado_asignacion: string
    tecnicos: {
      nombre: string
      apellido: string
    } | null
  }[]
}

// Select base para queries de incidentes
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

const INCIDENTE_CON_CLIENTE_SELECT = `
  ${INCIDENTE_SELECT},
  clientes:id_cliente_reporta (
    nombre,
    apellido,
    telefono
  )
`

/**
 * Obtener todos los incidentes (admin)
 */
export async function getIncidentes(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('incidentes')
    .select(INCIDENTE_CON_CLIENTE_SELECT)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return (data as unknown) as Incidente[]
}

/**
 * Obtener incidentes de un cliente específico
 */
export async function getIncidentesByCliente(
  supabase: SupabaseClient,
  idCliente: number
) {
  const { data, error } = await supabase
    .from('incidentes')
    .select(INCIDENTE_SELECT)
    .eq('id_cliente_reporta', idCliente)
    .order('fecha_registro', { ascending: false })

  if (error) throw error
  return (data as unknown) as Incidente[]
}

/**
 * Obtener incidentes asignados a un técnico
 */
export async function getIncidentesByTecnico(
  supabase: SupabaseClient,
  idTecnico: number
) {
  const { data, error } = await supabase
    .from('asignaciones_tecnico')
    .select(`
      id_asignacion,
      estado_asignacion,
      fecha_asignacion,
      observaciones,
      incidentes (
        ${INCIDENTE_SELECT}
      )
    `)
    .eq('id_tecnico', idTecnico)
    .in('estado_asignacion', ['aceptada', 'en_curso'])
    .order('fecha_asignacion', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Obtener un incidente por ID con todos los detalles
 */
export async function getIncidenteById(
  supabase: SupabaseClient,
  idIncidente: number
) {
  const { data, error } = await supabase
    .from('incidentes')
    .select(`
      ${INCIDENTE_CON_CLIENTE_SELECT},
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
  return (data as unknown) as IncidenteConDetalles
}

/**
 * Crear un nuevo incidente
 */
export async function createIncidente(
  supabase: SupabaseClient,
  data: {
    id_propiedad: number
    id_cliente_reporta: number
    descripcion_problema: string
    disponibilidad?: string
  }
) {
  const { data: incidente, error } = await supabase
    .from('incidentes')
    .insert({
      ...data,
      categoria: null, // Asignada por admin
      estado_actual: 'pendiente',
    })
    .select()
    .single()

  if (error) throw error
  return incidente
}

/**
 * Actualizar estado de un incidente
 */
export async function updateIncidenteEstado(
  supabase: SupabaseClient,
  idIncidente: number,
  estado: string
) {
  const { error } = await supabase
    .from('incidentes')
    .update({ estado_actual: estado })
    .eq('id_incidente', idIncidente)

  if (error) throw error
}

/**
 * Actualizar incidente (admin)
 */
export async function updateIncidente(
  supabase: SupabaseClient,
  idIncidente: number,
  updates: {
    estado_actual?: string
    nivel_prioridad?: string
    categoria?: string | null
  }
) {
  const { error } = await supabase
    .from('incidentes')
    .update(updates)
    .eq('id_incidente', idIncidente)

  if (error) throw error
}
