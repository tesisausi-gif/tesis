/**
 * Servicio de Usuarios
 * Queries para Server Components
 *
 * NOTA: Para getCurrentUser() usar @/features/auth
 */

import { createClient } from '@/shared/lib/supabase/server'
import type { Usuario, Cliente, Tecnico, TecnicoActivo } from './usuarios.types'

/**
 * Obtener todos los usuarios (admin)
 */
export async function getUsuarios(): Promise<Usuario[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as Usuario[]
}

/**
 * Obtener todos los clientes (admin)
 */
export async function getClientes(): Promise<Cliente[]> {
  const supabase = await createClient()

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
export async function getClienteById(idCliente: number): Promise<Cliente> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id_cliente', idCliente)
    .single()

  if (error) throw error
  return data as Cliente
}

/**
 * Obtener todos los técnicos (admin)
 */
export async function getTecnicos(): Promise<Tecnico[]> {
  const supabase = await createClient()

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
export async function getTecnicosActivos(): Promise<TecnicoActivo[]> {
  const supabase = await createClient()

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
export async function getTecnicoById(idTecnico: number): Promise<Tecnico> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .eq('id_tecnico', idTecnico)
    .single()

  if (error) throw error
  return data as Tecnico
}
