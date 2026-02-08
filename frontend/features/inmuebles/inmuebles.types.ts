/**
 * Tipos de Inmuebles
 * Tipos del dominio para inmuebles/propiedades
 */

import type { ClienteResumen, TipoInmueble } from '@/shared/types'

// Re-exportar TipoInmueble
export type { TipoInmueble }

// Inmueble base
export interface InmuebleBase {
  id_inmueble: number
  id_cliente: number
  id_tipo_inmueble: number
  provincia: string | null
  localidad: string | null
  barrio: string | null
  calle: string | null
  altura: string | null
  piso: string | null
  dpto: string | null
  informacion_adicional: string | null
  esta_activo: boolean
  fecha_creacion: string
}

// Inmueble con tipo
export interface Inmueble extends InmuebleBase {
  tipos_inmuebles: { nombre: string } | null
}

// Inmueble con cliente (para admin)
export interface InmuebleConCliente extends Inmueble {
  clientes: ClienteResumen | null
}

// DTO para crear inmueble
export interface CreateInmuebleDTO {
  id_cliente: number
  id_tipo_inmueble: number
  provincia?: string
  localidad?: string
  barrio?: string
  calle?: string
  altura?: string
  piso?: string
  dpto?: string
  informacion_adicional?: string
}

// DTO para actualizar inmueble
export interface UpdateInmuebleDTO {
  id_tipo_inmueble?: number
  provincia?: string | null
  localidad?: string | null
  barrio?: string | null
  calle?: string | null
  altura?: string | null
  piso?: string | null
  dpto?: string | null
  informacion_adicional?: string | null
  esta_activo?: boolean
}
