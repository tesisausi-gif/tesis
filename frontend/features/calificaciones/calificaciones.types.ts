/**
 * Tipos y interfaces para el módulo de Calificaciones
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
  id_cliente: number
  estrellas: EstrellasCalificacion | number
  comentario?: string | null
  aspecto_tecnico?: number | null // 1-5
  puntualidad?: number | null // 1-5
  actitud?: number | null // 1-5
  fecha_calificacion?: string
  fecha_registro?: string
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
  clientes?: {
    nombre: string
    apellido: string
  }
}
