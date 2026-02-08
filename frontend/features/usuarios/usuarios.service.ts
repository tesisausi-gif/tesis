/**
 * Servicio de Usuarios
 * Orquesta repositories para Server Components
 */

import { createClient } from '@/shared/lib/supabase/server'
import * as UsuarioRepository from './usuarios.repository'
import type { UsuarioActual } from '@/features/auth'
import type {
  Usuario,
  Cliente,
  Tecnico,
  TecnicoActivo,
} from './usuarios.types'

// Re-exportar tipos para compatibilidad
export type { Usuario, Cliente, Tecnico, TecnicoActivo }
export type { UsuarioActual }

/**
 * Obtener usuario actual
 * Para usar en Server Components
 */
export async function getCurrentUser(): Promise<UsuarioActual | null> {
  const supabase = await createClient()
  return UsuarioRepository.findCurrentUser(supabase)
}

/**
 * Obtener todos los usuarios (admin)
 * Para usar en Server Components
 */
export async function getUsuarios(): Promise<Usuario[]> {
  const supabase = await createClient()
  return UsuarioRepository.findAllUsuarios(supabase)
}

/**
 * Obtener todos los clientes (admin)
 * Para usar en Server Components
 */
export async function getClientes(): Promise<Cliente[]> {
  const supabase = await createClient()
  return UsuarioRepository.findAllClientes(supabase)
}

/**
 * Obtener cliente por ID
 * Para usar en Server Components
 */
export async function getClienteById(idCliente: number): Promise<Cliente> {
  const supabase = await createClient()
  return UsuarioRepository.findClienteById(supabase, idCliente)
}

/**
 * Obtener todos los técnicos (admin)
 * Para usar en Server Components
 */
export async function getTecnicos(): Promise<Tecnico[]> {
  const supabase = await createClient()
  return UsuarioRepository.findAllTecnicos(supabase)
}

/**
 * Obtener técnicos activos (para selects)
 * Para usar en Server Components
 */
export async function getTecnicosActivos(): Promise<TecnicoActivo[]> {
  const supabase = await createClient()
  return UsuarioRepository.findTecnicosActivos(supabase)
}

/**
 * Obtener técnico por ID
 * Para usar en Server Components
 */
export async function getTecnicoById(idTecnico: number): Promise<Tecnico> {
  const supabase = await createClient()
  return UsuarioRepository.findTecnicoById(supabase, idTecnico)
}
