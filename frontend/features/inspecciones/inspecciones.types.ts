/**
 * Tipos y interfaces para el módulo de Inspecciones
 */

export interface InspeccionBase {
  id_inspeccion?: number
  id_incidente: number
  id_tecnico: number
  fecha_inspeccion?: string
  descripcion_inspeccion: string
  hallazgos?: string | null
  fotos_url?: string[] | null
  estado_inmueble?: string | null
  observaciones?: string | null
  fecha_registro?: string
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
