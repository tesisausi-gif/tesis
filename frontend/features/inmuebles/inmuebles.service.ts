/**
 * Servicio de Inmuebles
 * Orquesta repositories + auth para Server Components
 */

import { createClient } from '@/shared/lib/supabase/server'
import * as InmuebleRepository from './inmuebles.repository'
import { requireClienteId } from '@/features/auth'
import type {
  Inmueble,
  InmuebleConCliente,
  TipoInmueble,
} from './inmuebles.types'

// Re-exportar tipos para compatibilidad
export type { Inmueble, InmuebleConCliente, TipoInmueble }

/**
 * Obtener todos los inmuebles (admin)
 * Para usar en Server Components
 */
export async function getInmueblesForAdmin(): Promise<InmuebleConCliente[]> {
  const supabase = await createClient()
  return InmuebleRepository.findAll(supabase)
}

/**
 * Obtener inmuebles del cliente actual
 * Para usar en Server Components
 */
export async function getInmueblesByCurrentUser(): Promise<Inmueble[]> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()
  return InmuebleRepository.findByCliente(supabase, idCliente)
}

/**
 * Obtener inmuebles activos del cliente actual
 * Para usar en Server Components
 */
export async function getInmueblesActivosByCurrentUser(): Promise<Inmueble[]> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()
  return InmuebleRepository.findActivosByCliente(supabase, idCliente)
}

/**
 * Obtener inmueble por ID
 * Para usar en Server Components
 */
export async function getInmuebleById(
  idInmueble: number
): Promise<InmuebleConCliente> {
  const supabase = await createClient()
  return InmuebleRepository.findById(supabase, idInmueble)
}

/**
 * Obtener tipos de inmuebles
 * Para usar en Server Components
 */
export async function getTiposInmuebles(): Promise<TipoInmueble[]> {
  const supabase = await createClient()
  return InmuebleRepository.findTipos(supabase)
}
