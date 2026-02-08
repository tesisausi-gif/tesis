/**
 * Servicio de Autenticación
 * Centraliza la lógica de autenticación para Server Components
 */

import { createClient } from '@/shared/lib/supabase/server'
import type { UsuarioActual } from './auth.types'

/**
 * Obtiene el usuario actual autenticado
 * Para usar en Server Components
 */
export async function getCurrentUser(): Promise<UsuarioActual | null> {
  const supabase = await createClient()

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
 * Obtiene el usuario actual y lanza error si no está autenticado
 */
export async function requireUser(): Promise<UsuarioActual> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Usuario no autenticado')
  }
  return user
}

/**
 * Obtiene el id_cliente del usuario actual
 */
export async function getCurrentClienteId(): Promise<number | null> {
  const user = await getCurrentUser()
  return user?.id_cliente ?? null
}

/**
 * Obtiene el id_cliente del usuario actual o lanza error
 */
export async function requireClienteId(): Promise<number> {
  const user = await requireUser()
  if (!user.id_cliente) {
    throw new Error('Usuario no es cliente')
  }
  return user.id_cliente
}

/**
 * Obtiene el id_tecnico del usuario actual
 */
export async function getCurrentTecnicoId(): Promise<number | null> {
  const user = await getCurrentUser()
  return user?.id_tecnico ?? null
}

/**
 * Obtiene el id_tecnico del usuario actual o lanza error
 */
export async function requireTecnicoId(): Promise<number> {
  const user = await requireUser()
  if (!user.id_tecnico) {
    throw new Error('Usuario no es técnico')
  }
  return user.id_tecnico
}

/**
 * Verifica si el usuario tiene rol de admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.rol === 'admin' || user?.rol === 'gestor'
}

/**
 * Requiere que el usuario sea admin
 */
export async function requireAdmin(): Promise<UsuarioActual> {
  const user = await requireUser()
  if (user.rol !== 'admin' && user.rol !== 'gestor') {
    throw new Error('Acceso denegado: se requiere rol de administrador')
  }
  return user
}
