/**
 * Servicio de Usuarios
 * Centraliza las queries relacionadas con usuarios, clientes y técnicos
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Tipos
export interface Usuario {
  id: string
  nombre: string
  apellido: string
  rol: string
  id_cliente: number | null
  id_tecnico: number | null
  esta_activo: boolean
  fecha_creacion: string
}

export interface Cliente {
  id_cliente: number
  nombre: string
  apellido: string
  correo_electronico: string
  telefono: string | null
  dni: string | null
  esta_activo: boolean
  fecha_creacion: string
}

export interface Tecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  correo_electronico: string | null
  telefono: string | null
  especialidad: string | null
  calificacion_promedio: number | null
  cantidad_trabajos_realizados: number
  esta_activo: boolean
  fecha_creacion: string
}

/**
 * Obtener usuario actual con su información completa
 */
export async function getCurrentUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, nombre, apellido, rol, id_cliente, id_tecnico, esta_activo')
    .eq('id', user.id)
    .single()

  if (error) throw error

  return {
    ...usuario,
    email: user.email,
  }
}

/**
 * Obtener todos los usuarios (admin)
 */
export async function getUsuarios(supabase: SupabaseClient) {
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
export async function getClientes(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as Cliente[]
}

/**
 * Obtener todos los técnicos (admin)
 */
export async function getTecnicos(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return data as Tecnico[]
}

/**
 * Obtener técnicos activos (para asignaciones)
 */
export async function getTecnicosActivos(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('id_tecnico, nombre, apellido, especialidad')
    .eq('esta_activo', true)
    .order('nombre')

  if (error) throw error
  return data
}

/**
 * Obtener cliente por ID
 */
export async function getClienteById(
  supabase: SupabaseClient,
  idCliente: number
) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id_cliente', idCliente)
    .single()

  if (error) throw error
  return data as Cliente
}

/**
 * Obtener técnico por ID
 */
export async function getTecnicoById(
  supabase: SupabaseClient,
  idTecnico: number
) {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .eq('id_tecnico', idTecnico)
    .single()

  if (error) throw error
  return data as Tecnico
}

/**
 * Toggle estado activo de usuario
 */
export async function toggleUsuarioActivo(
  supabase: SupabaseClient,
  idUsuario: string,
  activo: boolean
) {
  const { error } = await supabase
    .from('usuarios')
    .update({ esta_activo: activo })
    .eq('id', idUsuario)

  if (error) throw error
}

/**
 * Toggle estado activo de cliente
 */
export async function toggleClienteActivo(
  supabase: SupabaseClient,
  idCliente: number,
  activo: boolean
) {
  const { error } = await supabase
    .from('clientes')
    .update({ esta_activo: activo ? 1 : 0 })
    .eq('id_cliente', idCliente)

  if (error) throw error
}

/**
 * Toggle estado activo de técnico
 */
export async function toggleTecnicoActivo(
  supabase: SupabaseClient,
  idTecnico: number,
  activo: boolean
) {
  const { error } = await supabase
    .from('tecnicos')
    .update({ esta_activo: activo ? 1 : 0 })
    .eq('id_tecnico', idTecnico)

  if (error) throw error
}
