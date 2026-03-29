'use server'

/**
 * Servicio de envío de emails transaccionales.
 * Requiere la variable de entorno RESEND_API_KEY.
 */

import { Resend } from 'resend'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://tesis.vercel.app'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Sistema ISBA <noreply@isba.com>'

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY no configurada')
  return new Resend(apiKey)
}

function generarPasswordTemporal(): string {
  // Sin caracteres ambiguos (0/O, 1/l/I)
  const mayus = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const minus = 'abcdefghjkmnpqrstuvwxyz'
  const nums  = '23456789'
  const esps  = '@#$!%'
  const todos = mayus + minus + nums + esps
  // Garantizar al menos un carácter de cada tipo
  let pwd = ''
  pwd += mayus[Math.floor(Math.random() * mayus.length)]
  pwd += minus[Math.floor(Math.random() * minus.length)]
  pwd += nums[Math.floor(Math.random() * nums.length)]
  pwd += esps[Math.floor(Math.random() * esps.length)]
  for (let i = 4; i < 12; i++) {
    pwd += todos[Math.floor(Math.random() * todos.length)]
  }
  // Mezclar
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}

export { generarPasswordTemporal }

export async function enviarEmailBienvenida({
  destinatario,
  nombre,
  apellido,
  passwordTemporal,
  rol,
}: {
  destinatario: string
  nombre: string
  apellido: string
  passwordTemporal: string
  rol: 'tecnico' | 'cliente'
}): Promise<void> {
  const resend = getResend()

  const rolLabel = rol === 'tecnico' ? 'técnico' : 'cliente'
  const dashboardPath = rol === 'tecnico' ? '/tecnico' : '/cliente'
  const loginUrl = `${SITE_URL}/login`
  const appUrl = `${SITE_URL}${dashboardPath}`

  const subject = `Tu cuenta en Sistema ISBA fue aprobada`

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 24px; }
    .container { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #1e293b; padding: 28px 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 600; }
    .header p { color: #94a3b8; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; color: #1e293b; margin-bottom: 16px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .info-row:last-child { border-bottom: none; padding-bottom: 0; }
    .info-label { color: #64748b; }
    .info-value { color: #1e293b; font-weight: 600; font-family: monospace; }
    .password-box { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .password-box p { margin: 0 0 8px; font-size: 13px; color: #92400e; }
    .password-value { font-family: monospace; font-size: 22px; font-weight: 700; color: #1e293b; letter-spacing: 2px; }
    .warning { font-size: 12px; color: #b45309; margin-top: 8px; display: block; }
    .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; margin: 8px 4px; }
    .btn-outline { background: transparent; border: 2px solid #2563eb; color: #2563eb; }
    .buttons { text-align: center; margin: 24px 0; }
    .footer { padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; }
    .footer p { font-size: 12px; color: #94a3b8; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Sistema ISBA</h1>
      <p>Gestión de Incidentes</p>
    </div>
    <div class="body">
      <p class="greeting">Hola <strong>${nombre} ${apellido}</strong>,</p>
      <p style="color:#475569;font-size:14px;line-height:1.6;">
        Tu solicitud de registro como <strong>${rolLabel}</strong> fue aprobada.
        Ya podés acceder al sistema con las siguientes credenciales:
      </p>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Correo electrónico</span>
          <span class="info-value">${destinatario}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Rol</span>
          <span class="info-value">${rolLabel.charAt(0).toUpperCase() + rolLabel.slice(1)}</span>
        </div>
      </div>

      <div class="password-box">
        <p>Tu contraseña temporal:</p>
        <div class="password-value">${passwordTemporal}</div>
        <span class="warning">⚠️ Deberás cambiarla obligatoriamente en tu primer inicio de sesión.</span>
      </div>

      <div class="buttons">
        <a href="${loginUrl}" class="btn">Iniciar Sesión</a>
      </div>

      <p style="font-size:13px;color:#64748b;line-height:1.6;">
        Si tenés problemas para acceder, copiá este enlace en tu navegador:<br>
        <a href="${loginUrl}" style="color:#2563eb;word-break:break-all;">${loginUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>Este es un correo automático del Sistema ISBA. No respondas a este mensaje.</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  await resend.emails.send({
    from: FROM_EMAIL,
    to: destinatario,
    subject,
    html,
  })
}
