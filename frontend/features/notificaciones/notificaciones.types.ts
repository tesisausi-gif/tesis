/**
 * Tipos del módulo de Notificaciones
 */

// ─── Notificaciones en-app ─────────────────────────────────────────────────

export interface Notificacion {
  id_notificacion: number
  id_tecnico: number
  tipo: string
  titulo: string
  mensaje: string
  id_incidente: number | null
  id_presupuesto: number | null
  fecha_creacion: string
  fecha_leida: string | null
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
