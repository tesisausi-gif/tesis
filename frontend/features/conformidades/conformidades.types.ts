/**
 * Tipos del módulo de Conformidades
 * Columnas según esquema actual de producción.
 * tipo_conformidad CHECK constraint: 'final' | 'intermedia'
 */

export interface Conformidad {
  id_conformidad: number
  id_incidente: number
  id_cliente: number
  tipo_conformidad: string       // CHECK: 'final' | 'intermedia'
  esta_firmada: number | boolean  // INTEGER 0/1 en DB
  fecha_conformidad: string | null
  observaciones: string | null
  url_documento?: string | null
  fecha_creacion: string
  fecha_modificacion?: string
}

export interface CreateConformidadDTO {
  id_incidente: number
  id_cliente: number
  tipo_conformidad?: string
}

export interface FirmarConformidadDTO {
  id_conformidad: number
  observaciones?: string | null
}
