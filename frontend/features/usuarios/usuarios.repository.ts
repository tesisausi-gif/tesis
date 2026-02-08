/**
 * Repository de Usuarios
 * Queries puras a Supabase para usuarios, clientes y técnicos
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { UsuarioActual } from '@/features/auth'
import type {
  Usuario,
  Cliente,
  Tecnico,
  TecnicoActivo,
} from './usuarios.types'

/**
 * Obtener usuario actual autenticado con datos del perfil
 */
export async function findCurrentUser(
  supabase: SupabaseClient
): Promise<UsuarioActual | null> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, nombre, apellido, rol, id_cliente, id_tecnico, esta_activo, fecha_creacion')
    .eq('id', user.id)
    .single()

  if (error) throw error

  return {
    ...usuario,
    email: user.email || '',
  }
}

/**
 * Obtener todos los usuarios
 */
export async function findAllUsuarios(
  supabase: SupabaseClient
): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as Usuario[]
}

/**
 * Obtener todos los clientes
 */
export async function findAllClientes(
  supabase: SupabaseClient
): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as Cliente[]
}

/**
 * Obtener cliente por ID
 */
export async function findClienteById(
  supabase: SupabaseClient,
  idCliente: number
): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id_cliente', idCliente)
    .single()

  if (error) throw error
  return data as Cliente
}

/**
 * Obtener todos los técnicos
 */
export async function findAllTecnicos(
  supabase: SupabaseClient
): Promise<Tecnico[]> {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as Tecnico[]
}

/**
 * Obtener técnicos activos (para selects de asignación)
 */
export async function findTecnicosActivos(
  supabase: SupabaseClient
): Promise<TecnicoActivo[]> {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('id_tecnico, nombre, apellido, especialidad')
    .eq('esta_activo', true)
    .order('nombre')

  if (error) throw error
  return data as TecnicoActivo[]
}

/**
 * Obtener técnico por ID
 */
export async function findTecnicoById(
  supabase: SupabaseClient,
  idTecnico: number
): Promise<Tecnico> {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .eq('id_tecnico', idTecnico)
    .single()

  if (error) throw error
  return data as Tecnico
}

/**
 * Actualizar estado activo de usuario
 */
export async function updateUsuarioActivo(
  supabase: SupabaseClient,
  idUsuario: string,
  activo: boolean
): Promise<void> {
  const { error } = await supabase
    .from('usuarios')
    .update({ esta_activo: activo })
    .eq('id', idUsuario)

  if (error) throw error
}

/**
 * Actualizar estado activo de cliente
 */
export async function updateClienteActivo(
  supabase: SupabaseClient,
  idCliente: number,
  activo: boolean
): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .update({ esta_activo: activo })
    .eq('id_cliente', idCliente)

  if (error) throw error
}

/**
 * Actualizar estado activo de técnico
 */
export async function updateTecnicoActivo(
  supabase: SupabaseClient,
  idTecnico: number,
  activo: boolean
): Promise<void> {
  const { error } = await supabase
    .from('tecnicos')
    .update({ esta_activo: activo })
    .eq('id_tecnico', idTecnico)

  if (error) throw error
}
