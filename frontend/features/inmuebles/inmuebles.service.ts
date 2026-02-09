/**
 * Servicio de Inmuebles
 * Queries para Server Components
 */

import { createClient } from '@/shared/lib/supabase/server'
import { requireClienteId } from '@/features/auth/auth.service'
import type { Inmueble, InmuebleConCliente, TipoInmueble } from './inmuebles.types'

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
export async function getInmueblesForAdmin(): Promise<InmuebleConCliente[]> {
  const supabase = await createClient()

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
 * Obtener inmuebles del cliente actual
 */
export async function getInmueblesByCurrentUser(): Promise<Inmueble[]> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()

  const { data, error } = await supabase
    .from('inmuebles')
    .select(INMUEBLE_SELECT)
    .eq('id_cliente', idCliente)
    .order('calle')

  if (error) throw error
  return data as unknown as Inmueble[]
}

/**
 * Obtener inmuebles activos del cliente actual
 */
export async function getInmueblesActivosByCurrentUser(): Promise<Inmueble[]> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()

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
export async function getInmuebleById(idInmueble: number): Promise<InmuebleConCliente> {
  const supabase = await createClient()

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
export async function getTiposInmuebles(): Promise<TipoInmueble[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tipos_inmuebles')
    .select('id_tipo_inmueble, nombre')
    .eq('esta_activo', true)
    .order('nombre')

  if (error) throw error
  return data as TipoInmueble[]
}
