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

// Compromiso con join a incidente + inmueble — para la vista de agenda del técnico
export interface CompromisoAgenda extends CompromisoTecnico {
  incidentes: {
    descripcion_problema: string
    categoria: string | null
    inmuebles: {
      calle: string
      altura: string | null
      barrio: string | null
      localidad: string
    } | null
  } | null
}
