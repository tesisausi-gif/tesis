export interface FranjaDisponibilidad {
  id_franja?: number
  id_incidente: number
  fecha: string       // 'YYYY-MM-DD'
  hora_inicio: string // 'HH:MM'
  hora_fin: string    // 'HH:MM'
}

export interface CompromisoTecnico {
  id_compromiso?: number
  id_asignacion: number
  id_incidente: number
  id_tecnico: number
  fecha_visita: string      // 'YYYY-MM-DD'
  hora_inicio: string       // 'HH:MM'
  hora_fin_estimada: string // 'HH:MM'
  estado: 'programado' | 'completado' | 'cancelado'
}
