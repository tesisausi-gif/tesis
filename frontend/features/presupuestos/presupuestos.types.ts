/**
 * Tipos y interfaces para el módulo de Presupuestos
 */

import { EstadoPresupuesto } from '@/shared/types/enums'

export interface PresupuestoBase {
  id_presupuesto?: number
  id_incidente: number
  id_tecnico: number
  descripcion_trabajo: string
  costo_total: number
  detalles_trabajo?: string
  estado_presupuesto?: EstadoPresupuesto | string
  fecha_creacion?: string
  fecha_vencimiento?: string
  fecha_aprobacion?: string
  fecha_rechazo?: string
  razon_rechazo?: string | null
  fecha_actualizacion?: string
}

export interface Presupuesto extends PresupuestoBase {
  id_presupuesto: number
}

export interface PresupuestoConDetalle extends Presupuesto {
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

export interface PresupuestoParaCliente extends Presupuesto {
  tecnico_nombre?: string
  tecnico_apellido?: string
  incidente_categoria?: string
}
