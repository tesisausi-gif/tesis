/**
 * Servicio de Inmuebles
 * Centraliza las queries relacionadas con inmuebles/propiedades
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Tipos
export interface Inmueble {
  id_inmueble: number
  id_cliente: number
  id_tipo_inmueble: number
  calle: string | null
  altura: string | null
  piso: string | null
  dpto: string | null
  barrio: string | null
  localidad: string | null
  provincia: string | null
  informacion_adicional: string | null
  esta_activo: boolean
  fecha_creacion: string
  tipos_inmuebles?: {
    nombre: string
  } | null
  clientes?: {
    nombre: string
    apellido: string
    correo_electronico: string
  } | null
}

export interface TipoInmueble {
  id_tipo_inmueble: number
  nombre: string
}

// Select base
const INMUEBLE_SELECT = `
  id_inmueble,
  id_cliente,
  id_tipo_inmueble,
  calle,
  altura,
  piso,
  dpto,
  barrio,
  localidad,
  provincia,
  informacion_adicional,
  esta_activo,
  fecha_creacion,
  tipos_inmuebles (nombre)
`

/**
 * Obtener todos los inmuebles (admin)
 */
export async function getInmuebles(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('inmuebles')
    .select(`
      ${INMUEBLE_SELECT},
      clientes (nombre, apellido, correo_electronico)
    `)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return (data as unknown) as Inmueble[]
}

/**
 * Obtener inmuebles de un cliente
 */
export async function getInmueblesByCliente(
  supabase: SupabaseClient,
  idCliente: number
) {
  const { data, error } = await supabase
    .from('inmuebles')
    .select(INMUEBLE_SELECT)
    .eq('id_cliente', idCliente)
    .eq('esta_activo', 1)
    .order('calle')

  if (error) throw error
  return (data as unknown) as Inmueble[]
}

/**
 * Obtener inmueble por ID con detalles
 */
export async function getInmuebleById(
  supabase: SupabaseClient,
  idInmueble: number
) {
  const { data, error } = await supabase
    .from('inmuebles')
    .select(`
      ${INMUEBLE_SELECT},
      clientes (nombre, apellido, correo_electronico)
    `)
    .eq('id_inmueble', idInmueble)
    .single()

  if (error) throw error
  return (data as unknown) as Inmueble
}

/**
 * Obtener tipos de inmuebles
 */
export async function getTiposInmuebles(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('tipos_inmuebles')
    .select('id_tipo_inmueble, nombre')
    .order('nombre')

  if (error) throw error
  return (data as unknown) as TipoInmueble[]
}

/**
 * Crear un nuevo inmueble
 */
export async function createInmueble(
  supabase: SupabaseClient,
  data: {
    id_cliente: number
    id_tipo_inmueble: number
    calle?: string
    altura?: string
    piso?: string
    dpto?: string
    barrio?: string
    localidad?: string
    provincia?: string
    informacion_adicional?: string
  }
) {
  const { data: inmueble, error } = await supabase
    .from('inmuebles')
    .insert({
      ...data,
      esta_activo: 1,
      fecha_creacion: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return inmueble
}

/**
 * Actualizar un inmueble
 */
export async function updateInmueble(
  supabase: SupabaseClient,
  idInmueble: number,
  updates: Partial<Omit<Inmueble, 'id_inmueble' | 'fecha_creacion'>>
) {
  const { error } = await supabase
    .from('inmuebles')
    .update(updates)
    .eq('id_inmueble', idInmueble)

  if (error) throw error
}

/**
 * Toggle estado activo de inmueble
 */
export async function toggleInmuebleActivo(
  supabase: SupabaseClient,
  idInmueble: number,
  activo: boolean
) {
  const { error } = await supabase
    .from('inmuebles')
    .update({ esta_activo: activo ? 1 : 0 })
    .eq('id_inmueble', idInmueble)

  if (error) throw error
}
