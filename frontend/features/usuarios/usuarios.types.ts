/**
 * Tipos de Usuarios
 * Tipos del dominio para usuarios, clientes y técnicos
 */

import type { TecnicoActivo } from '@/shared/types'
import type { UsuarioActual } from '@/features/auth'

// Re-exportar tipos
export type { TecnicoActivo }
// UsuarioActual está definido en features/auth, usar desde allí

// Usuario del sistema
export interface Usuario {
  id: string
  nombre: string
  apellido: string
  rol: string
  id_cliente: number | null
  id_tecnico: number | null
  esta_activo: boolean
  fecha_creacion: string
  email?: string
}

// Alias para compatibilidad interna
export type { UsuarioActual }

// Cliente completo
export interface Cliente {
  id_cliente: number
  nombre: string
  apellido: string
  correo_electronico: string | null
  telefono: string | null
  dni: string | null
  tipo_cliente: string | null
  esta_activo: boolean
  fecha_creacion: string
}

// Técnico completo
export interface Tecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  correo_electronico: string | null
  telefono: string | null
  dni: string | null
  direccion: string | null
  especialidad: string | null
  calificacion_promedio: number | null
  cantidad_trabajos_realizados: number
  esta_activo: boolean
  fecha_creacion: string
}
