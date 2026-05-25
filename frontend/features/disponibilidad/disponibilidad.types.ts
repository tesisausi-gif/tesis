export interface FranjaDisponibilidad {
  id_franja?: number
  id_incidente: number
  fecha: string       // 'YYYY-MM-DD'
  hora_inicio: string // 'HH:MM'
  hora_fin: string    // 'HH:MM'
}

// Visita programada — mapeada desde asignaciones_tecnico (fecha_visita_programada + hora_fin_programada)
export interface CompromisoTecnico {
  id_asignacion: number
  id_incidente: number
  id_tecnico: number
  fecha_visita: string      // 'YYYY-MM-DD'
  hora_inicio: string       // 'HH:MM'
  hora_fin_estimada: string // 'HH:MM'
}

// Visita programada con join a incidente + inmueble — para la vista de agenda del técnico
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
