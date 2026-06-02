export type EstadoVisita = 'propuesta' | 'confirmada' | 'completada' | 'cancelada' | 'rechazada'
export type TipoVisita   = 'inspeccion' | 'reparacion' | 'seguimiento'

export interface Visita {
  id_visita:               number
  id_incidente:            number
  id_tecnico:              number
  tipo:                    TipoVisita
  fecha_visita:            string   // 'YYYY-MM-DD'
  hora_inicio:             string   // 'HH:MM'
  hora_fin_estimada:       string | null
  estado:                  EstadoVisita
  fuera_de_disponibilidad: boolean
  notas_tecnico:           string | null
  motivo_rechazo:          string | null
  fecha_creacion:          string
}

// Para poblar listas/timelines sin traer todo
export interface VisitaResumen {
  id_visita:               number
  id_incidente:            number
  tipo:                    TipoVisita
  fecha_visita:            string
  hora_inicio:             string
  hora_fin_estimada:       string | null
  estado:                  EstadoVisita
  fuera_de_disponibilidad: boolean
  notas_tecnico:           string | null
}
