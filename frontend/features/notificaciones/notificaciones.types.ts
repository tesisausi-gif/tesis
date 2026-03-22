/**
 * Tipos del módulo de Notificaciones
 */

// ─── Notificaciones en-app ─────────────────────────────────────────────────

export interface Notificacion {
  id_notificacion: number
  id_tecnico: number | null
  id_cliente: number | null
  para_admin: boolean
  tipo: string
  titulo: string
  mensaje: string
  id_incidente: number | null
  id_presupuesto: number | null
  fecha_creacion: string
  fecha_leida: string | null
}

// Tipos de notificación por categoría visual
export type TipoNotificacionCategoria = 'urgente' | 'positivo' | 'informativo' | 'pendiente'

export const TIPO_CATEGORIA: Record<string, TipoNotificacionCategoria> = {
  conformidad_rechazada: 'urgente',
  presupuesto_rechazado: 'urgente',
  presupuesto_aprobado_admin: 'positivo',
  presupuesto_aprobado_cliente: 'positivo',
  incidente_resuelto: 'positivo',
  nueva_conformidad: 'pendiente',
  presupuesto_enviado: 'pendiente',
  nueva_asignacion: 'informativo',
  nuevo_avance: 'informativo',
}

// ─── Email ─────────────────────────────────────────────────────────────────

export interface EmailDestinatario {
  email: string
  name: string
}

export interface EmailPayload {
  to: EmailDestinatario
  subject: string
  htmlContent: string
}
