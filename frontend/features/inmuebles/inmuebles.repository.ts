/**
 * Repository de Inmuebles
 * Queries puras a Supabase para inmuebles/propiedades
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  Inmueble,
  InmuebleConCliente,
  TipoInmueble,
  CreateInmuebleDTO,
  UpdateInmuebleDTO,
} from './inmuebles.types'

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
 * Obtener todos los inmuebles (para admin)
 */
export async function findAll(
  supabase: SupabaseClient
): Promise<InmuebleConCliente[]> {
  const { data, error } = await supabase
    .from('inmuebles')
    .select(`
      ${INMUEBLE_SELECT},
      clientes (nombre, apellido, correo_electronico)
    `)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as unknown as InmuebleConCliente[]
}

/**
 * Obtener inmuebles de un cliente
 */
export async function findByCliente(
  supabase: SupabaseClient,
  idCliente: number
): Promise<Inmueble[]> {
  const { data, error } = await supabase
    .from('inmuebles')
    .select(INMUEBLE_SELECT)
    .eq('id_cliente', idCliente)
    .order('calle')

  if (error) throw error
  return data as unknown as Inmueble[]
}

/**
 * Obtener inmuebles activos de un cliente
 */
export async function findActivosByCliente(
  supabase: SupabaseClient,
  idCliente: number
): Promise<Inmueble[]> {
  const { data, error } = await supabase
    .from('inmuebles')
    .select(INMUEBLE_SELECT)
    .eq('id_cliente', idCliente)
    .eq('esta_activo', true)
    .order('calle')

  if (error) throw error
  return data as unknown as Inmueble[]
}

/**
 * Obtener inmueble por ID
 */
export async function findById(
  supabase: SupabaseClient,
  idInmueble: number
): Promise<InmuebleConCliente> {
  const { data, error } = await supabase
    .from('inmuebles')
    .select(`
      ${INMUEBLE_SELECT},
      clientes (nombre, apellido, correo_electronico)
    `)
    .eq('id_inmueble', idInmueble)
    .single()

  if (error) throw error
  return data as unknown as InmuebleConCliente
}

/**
 * Obtener tipos de inmuebles
 */
export async function findTipos(
  supabase: SupabaseClient
): Promise<TipoInmueble[]> {
  const { data, error } = await supabase
    .from('tipos_inmuebles')
    .select('id_tipo_inmueble, nombre')
    .eq('esta_activo', true)
    .order('nombre')

  if (error) throw error
  return data as TipoInmueble[]
}

/**
 * Crear un nuevo inmueble
 */
export async function create(
  supabase: SupabaseClient,
  dto: CreateInmuebleDTO
): Promise<{ id_inmueble: number }> {
  const { data, error } = await supabase
    .from('inmuebles')
    .insert({
      id_cliente: dto.id_cliente,
      id_tipo_inmueble: dto.id_tipo_inmueble,
      provincia: dto.provincia || null,
      localidad: dto.localidad || null,
      barrio: dto.barrio || null,
      calle: dto.calle || null,
      altura: dto.altura || null,
      piso: dto.piso || null,
      dpto: dto.dpto || null,
      informacion_adicional: dto.informacion_adicional || null,
      esta_activo: true,
    })
    .select('id_inmueble')
    .single()

  if (error) throw error
  return data
}

/**
 * Actualizar un inmueble
 */
export async function update(
  supabase: SupabaseClient,
  idInmueble: number,
  dto: UpdateInmuebleDTO
): Promise<void> {
  const { error } = await supabase
    .from('inmuebles')
    .update(dto)
    .eq('id_inmueble', idInmueble)

  if (error) throw error
}

/**
 * Actualizar estado activo de inmueble
 */
export async function updateActivo(
  supabase: SupabaseClient,
  idInmueble: number,
  activo: boolean
): Promise<void> {
  const { error } = await supabase
    .from('inmuebles')
    .update({ esta_activo: activo })
    .eq('id_inmueble', idInmueble)

  if (error) throw error
}
