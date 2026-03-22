/**
 * Tipos y interfaces para el módulo de Inspecciones
 * Columnas según esquema actual de producción.
 */

export interface InspeccionBase {
  id_inspeccion?: number
  id_incidente: number
  id_tecnico: number
  esta_anulada?: boolean
  fecha_inspeccion?: string
  descripcion_inspeccion: string
  causas_determinadas?: string | null
  danos_ocasionados?: string | null
  requiere_materiales?: number | null     // INTEGER 0/1 en DB
  descripcion_materiales?: string | null
  requiere_ayudantes?: number | null      // INTEGER 0/1 en DB
  cantidad_ayudantes?: number | null
  dias_estimados_trabajo?: number | null
  fecha_creacion?: string
  fecha_modificacion?: string
}

export interface Inspeccion extends InspeccionBase {
  id_inspeccion: number
}

export interface InspeccionConDetalle extends Inspeccion {
  incidentes?: {
    id_incidente: number
    descripcion_problema: string
    categoria: string
  }
  tecnicos?: {
    nombre: string
    apellido: string
  }
}
