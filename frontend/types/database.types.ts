// Tipos generados desde el esquema de Supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: {
          id_cliente: number
          nombre: string
          apellido: string
          dni: string | null
          correo_electronico: string | null
          telefono: string | null
          tipo_cliente: string | null
          esta_activo: boolean
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_cliente?: number
          nombre: string
          apellido: string
          dni?: string | null
          correo_electronico?: string | null
          telefono?: string | null
          tipo_cliente?: string | null
          esta_activo?: boolean
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_cliente?: number
          nombre?: string
          apellido?: string
          dni?: string | null
          correo_electronico?: string | null
          telefono?: string | null
          tipo_cliente?: string | null
          esta_activo?: boolean
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      inmuebles: {
        Row: {
          id_inmueble: number
          id_tipo_inmueble: number
          id_cliente: number
          provincia: string | null
          localidad: string | null
          barrio: string | null
          calle: string | null
          altura: string | null
          piso: string | null
          dpto: string | null
          informacion_adicional: string | null
          esta_activo: boolean
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_inmueble?: number
          id_tipo_inmueble: number
          id_cliente: number
          provincia?: string | null
          localidad?: string | null
          barrio?: string | null
          calle?: string | null
          altura?: string | null
          piso?: string | null
          dpto?: string | null
          informacion_adicional?: string | null
          esta_activo?: boolean
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_inmueble?: number
          id_tipo_inmueble?: number
          id_cliente?: number
          provincia?: string | null
          localidad?: string | null
          barrio?: string | null
          calle?: string | null
          altura?: string | null
          piso?: string | null
          dpto?: string | null
          informacion_adicional?: string | null
          esta_activo?: boolean
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      tipos_inmuebles: {
        Row: {
          id_tipo_inmueble: number
          nombre: string
          descripcion: string | null
          esta_activo: boolean
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_tipo_inmueble?: number
          nombre: string
          descripcion?: string | null
          esta_activo?: boolean
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_tipo_inmueble?: number
          nombre?: string
          descripcion?: string | null
          esta_activo?: boolean
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      incidentes: {
        Row: {
          id_incidente: number
          id_propiedad: number
          id_cliente_reporta: number
          descripcion_problema: string
          categoria: string | null
          nivel_prioridad: string | null
          estado_actual: string
          id_responsable_pago: number | null
          fecha_registro: string
          fecha_cierre: string | null
          fue_resuelto: boolean
          disponibilidad: string | null
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_incidente?: number
          id_propiedad: number
          id_cliente_reporta: number
          descripcion_problema: string
          categoria?: string | null
          nivel_prioridad?: string | null
          estado_actual?: string
          id_responsable_pago?: number | null
          fecha_registro?: string
          fecha_cierre?: string | null
          fue_resuelto?: boolean
          disponibilidad?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_incidente?: number
          id_propiedad?: number
          id_cliente_reporta?: number
          descripcion_problema?: string
          categoria?: string | null
          nivel_prioridad?: string | null
          estado_actual?: string
          id_responsable_pago?: number | null
          fecha_registro?: string
          fecha_cierre?: string | null
          fue_resuelto?: boolean
          disponibilidad?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      tecnicos: {
        Row: {
          id_tecnico: number
          nombre: string
          apellido: string
          correo_electronico: string | null
          telefono: string | null
          dni: string | null
          direccion: string | null
          especialidad: string | null
          calificacion_promedio: number | null
          cantidad_trabajos_realizados: number
          esta_activo: boolean
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_tecnico?: number
          nombre: string
          apellido: string
          correo_electronico?: string | null
          telefono?: string | null
          dni?: string | null
          direccion?: string | null
          especialidad?: string | null
          calificacion_promedio?: number | null
          cantidad_trabajos_realizados?: number
          esta_activo?: boolean
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_tecnico?: number
          nombre?: string
          apellido?: string
          correo_electronico?: string | null
          telefono?: string | null
          dni?: string | null
          direccion?: string | null
          especialidad?: string | null
          calificacion_promedio?: number | null
          cantidad_trabajos_realizados?: number
          esta_activo?: boolean
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      asignaciones_tecnico: {
        Row: {
          id_asignacion: number
          id_incidente: number
          id_tecnico: number
          fecha_asignacion: string
          estado_asignacion: string
          fecha_visita_programada: string | null
          observaciones: string | null
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_asignacion?: number
          id_incidente: number
          id_tecnico: number
          fecha_asignacion?: string
          estado_asignacion?: string
          fecha_visita_programada?: string | null
          observaciones?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_asignacion?: number
          id_incidente?: number
          id_tecnico?: number
          fecha_asignacion?: string
          estado_asignacion?: string
          fecha_visita_programada?: string | null
          observaciones?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      inspecciones: {
        Row: {
          id_inspeccion: number
          id_incidente: number
          id_tecnico: number
          fecha_inspeccion: string
          descripcion_inspeccion: string
          causas_determinadas: string | null
          danos_ocasionados: string | null
          requiere_materiales: boolean
          descripcion_materiales: string | null
          requiere_ayudantes: boolean
          cantidad_ayudantes: number | null
          dias_estimados_trabajo: number | null
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_inspeccion?: number
          id_incidente: number
          id_tecnico: number
          fecha_inspeccion?: string
          descripcion_inspeccion: string
          causas_determinadas?: string | null
          danos_ocasionados?: string | null
          requiere_materiales?: boolean
          descripcion_materiales?: string | null
          requiere_ayudantes?: boolean
          cantidad_ayudantes?: number | null
          dias_estimados_trabajo?: number | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_inspeccion?: number
          id_incidente?: number
          id_tecnico?: number
          fecha_inspeccion?: string
          descripcion_inspeccion?: string
          causas_determinadas?: string | null
          danos_ocasionados?: string | null
          requiere_materiales?: boolean
          descripcion_materiales?: string | null
          requiere_ayudantes?: boolean
          cantidad_ayudantes?: number | null
          dias_estimados_trabajo?: number | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      presupuestos: {
        Row: {
          id_presupuesto: number
          id_incidente: number
          id_inspeccion: number | null
          descripcion_detallada: string
          costo_materiales: number
          costo_mano_obra: number
          gastos_administrativos: number
          costo_total: number
          estado_presupuesto: string
          fecha_aprobacion: string | null
          id_aprobado_por: number | null
          alternativas_reparacion: string | null
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_presupuesto?: number
          id_incidente: number
          id_inspeccion?: number | null
          descripcion_detallada: string
          costo_materiales?: number
          costo_mano_obra?: number
          gastos_administrativos?: number
          costo_total?: number
          estado_presupuesto?: string
          fecha_aprobacion?: string | null
          id_aprobado_por?: number | null
          alternativas_reparacion?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_presupuesto?: number
          id_incidente?: number
          id_inspeccion?: number | null
          descripcion_detallada?: string
          costo_materiales?: number
          costo_mano_obra?: number
          gastos_administrativos?: number
          costo_total?: number
          estado_presupuesto?: string
          fecha_aprobacion?: string | null
          id_aprobado_por?: number | null
          alternativas_reparacion?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      pagos: {
        Row: {
          id_pago: number
          id_incidente: number
          id_presupuesto: number
          monto_pagado: number
          tipo_pago: string
          fecha_pago: string
          metodo_pago: string
          numero_comprobante: string | null
          url_comprobante: string | null
          observaciones: string | null
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_pago?: number
          id_incidente: number
          id_presupuesto: number
          monto_pagado: number
          tipo_pago: string
          fecha_pago?: string
          metodo_pago: string
          numero_comprobante?: string | null
          url_comprobante?: string | null
          observaciones?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_pago?: number
          id_incidente?: number
          id_presupuesto?: number
          monto_pagado?: number
          tipo_pago?: string
          fecha_pago?: string
          metodo_pago?: string
          numero_comprobante?: string | null
          url_comprobante?: string | null
          observaciones?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      conformidades: {
        Row: {
          id_conformidad: number
          id_incidente: number
          id_cliente: number
          tipo_conformidad: string
          esta_firmada: boolean
          fecha_conformidad: string
          observaciones: string | null
          url_documento: string | null
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_conformidad?: number
          id_incidente: number
          id_cliente: number
          tipo_conformidad: string
          esta_firmada?: boolean
          fecha_conformidad?: string
          observaciones?: string | null
          url_documento?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_conformidad?: number
          id_incidente?: number
          id_cliente?: number
          tipo_conformidad?: string
          esta_firmada?: boolean
          fecha_conformidad?: string
          observaciones?: string | null
          url_documento?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      calificaciones: {
        Row: {
          id_calificacion: number
          id_incidente: number
          id_tecnico: number
          tipo_calificacion: string
          puntuacion: number
          comentarios: string | null
          resolvio_problema: boolean
          fecha_calificacion: string
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_calificacion?: number
          id_incidente: number
          id_tecnico: number
          tipo_calificacion: string
          puntuacion: number
          comentarios?: string | null
          resolvio_problema?: boolean
          fecha_calificacion?: string
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_calificacion?: number
          id_incidente?: number
          id_tecnico?: number
          tipo_calificacion?: string
          puntuacion?: number
          comentarios?: string | null
          resolvio_problema?: boolean
          fecha_calificacion?: string
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      documentos: {
        Row: {
          id_documento: number
          id_incidente: number
          tipo_documento: string
          nombre_archivo: string
          url_almacenamiento: string
          tipo_mime: string | null
          tamano_bytes: number | null
          descripcion: string | null
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id_documento?: number
          id_incidente: number
          tipo_documento: string
          nombre_archivo: string
          url_almacenamiento: string
          tipo_mime?: string | null
          tamano_bytes?: number | null
          descripcion?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id_documento?: number
          id_incidente?: number
          tipo_documento?: string
          nombre_archivo?: string
          url_almacenamiento?: string
          tipo_mime?: string | null
          tamano_bytes?: number | null
          descripcion?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
