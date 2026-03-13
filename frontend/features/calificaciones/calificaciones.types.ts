/**
 * Tipos y interfaces para el módulo de Calificaciones
 * Columnas según esquema actual de producción.
 */

export enum EstrellasCalificacion {
  UNA = 1,
  DOS = 2,
  TRES = 3,
  CUATRO = 4,
  CINCO = 5,
}

export interface CalificacionBase {
  id_calificacion?: number
  id_incidente: number
  id_tecnico: number
  tipo_calificacion?: string | null  // CHECK constraint en DB, puede ser NULL
  puntuacion: EstrellasCalificacion | number
  comentarios?: string | null
  resolvio_problema?: number | null  // INTEGER 0/1 en DB
  fecha_calificacion?: string
  fecha_creacion?: string
  fecha_modificacion?: string
}

export interface Calificacion extends CalificacionBase {
  id_calificacion: number
}

export interface CalificacionConDetalles extends Calificacion {
  incidentes?: {
    id_incidente: number
    descripcion_problema: string
    estado_actual: string
  }
  tecnicos?: {
    nombre: string
    apellido: string
    email: string
  }
}
