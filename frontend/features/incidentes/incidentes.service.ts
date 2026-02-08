/**
 * Servicio de Incidentes
 * Orquesta repositories + auth para Server Components
 */

import { createClient } from '@/shared/lib/supabase/server'
import * as IncidenteRepository from './incidentes.repository'
import { requireClienteId } from '@/features/auth'
import type {
  Incidente,
  IncidenteConCliente,
  IncidenteConDetalles,
} from './incidentes.types'

// Re-exportar tipos para compatibilidad
export type { Incidente, IncidenteConCliente, IncidenteConDetalles }

/**
 * Obtener todos los incidentes (admin)
 * Para usar en Server Components
 */
export async function getIncidentesForAdmin(): Promise<IncidenteConCliente[]> {
  const supabase = await createClient()
  return IncidenteRepository.findAll(supabase)
}

/**
 * Obtener incidentes del cliente actual
 * Para usar en Server Components
 */
export async function getIncidentesByCurrentUser(): Promise<Incidente[]> {
  const supabase = await createClient()
  const idCliente = await requireClienteId()
  return IncidenteRepository.findByCliente(supabase, idCliente)
}

/**
 * Obtener incidente por ID
 * Para usar en Server Components
 */
export async function getIncidenteById(
  idIncidente: number
): Promise<IncidenteConDetalles> {
  const supabase = await createClient()
  return IncidenteRepository.findById(supabase, idIncidente)
}
