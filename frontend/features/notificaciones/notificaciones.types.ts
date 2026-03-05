/**
 * Tipos del módulo de Notificaciones por Email
 */

export interface EmailDestinatario {
  email: string
  name: string
}

export interface EmailPayload {
  to: EmailDestinatario
  subject: string
  htmlContent: string
}
