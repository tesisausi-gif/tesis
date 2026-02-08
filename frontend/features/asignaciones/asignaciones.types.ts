/**
 * Tipos de Asignaciones
 * Tipos del dominio para asignaciones de técnicos
 */

import type { InmuebleResumen, ClienteResumen, TecnicoResumen } from '@/shared/types'

// Incidente resumido para asignaciones
export interface IncidenteParaAsignacion {
  id_incidente: number
  descripcion_problema: string
  categoria: string | null
  nivel_prioridad: string | null
  estado_actual: string
  disponibilidad: string | null
  inmuebles: InmuebleResumen | null
  clientes: ClienteResumen | null
}

// Asignación base
export interface AsignacionBase {
  id_asignacion: number
  id_incidente: number
  id_tecnico: number
  estado_asignacion: string
  fecha_asignacion: string
  fecha_aceptacion?: string | null
  fecha_rechazo?: string | null
  fecha_visita_programada?: string | null
  observaciones?: string | null
}

// Asignación con relaciones
export interface Asignacion extends AsignacionBase {
  incidentes: IncidenteParaAsignacion | null
  tecnicos: TecnicoResumen | null
}

// Asignación para vista de técnico (con incidente expandido)
export interface AsignacionTecnico extends AsignacionBase {
  incidentes: {
    id_incidente: number
    descripcion_problema: string
    categoria: string | null
    nivel_prioridad: string | null
    estado_actual: string
    inmuebles: InmuebleResumen | null
  } | null
}

// DTO para crear asignación
export interface CreateAsignacionDTO {
  id_incidente: number
  id_tecnico: number
  observaciones?: string
}
