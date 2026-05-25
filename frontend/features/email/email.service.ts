'use server'

import nodemailer from 'nodemailer'

const APP_URL = 'https://tesis-three-drab.vercel.app'

function getTransport() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) throw new Error('GMAIL_USER o GMAIL_APP_PASSWORD no configuradas')
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

export async function enviarCredencialesTecnico({
  destinatario,
  nombre,
  apellido,
  passwordTemporal,
}: {
  destinatario: string
  nombre: string
  apellido: string
  passwordTemporal: string
}): Promise<void> {
  const transport = getTransport()

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 24px; }
    .container { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #1e293b; padding: 28px 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 600; }
    .header p { color: #94a3b8; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 32px; }
    .creds { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .row { padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; display: flex; justify-content: space-between; }
    .row:last-child { border-bottom: none; padding-bottom: 0; }
    .label { color: #64748b; }
    .value { color: #1e293b; font-weight: 700; font-family: monospace; }
    .warning { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #92400e; }
    .btn { display: block; background: #2563eb; color: #fff; text-decoration: none; padding: 14px 0; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; margin: 24px 0; }
    .footer { padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Sistema ISBA</h1>
      <p>Gestión de Incidentes</p>
    </div>
    <div class="body">
      <p style="font-size:16px;color:#1e293b;">Hola <strong>${nombre} ${apellido}</strong>,</p>
      <p style="color:#475569;font-size:14px;line-height:1.6;">
        Tu solicitud de registro como <strong>técnico</strong> fue aprobada. Podés ingresar al sistema con las siguientes credenciales:
      </p>
      <div class="creds">
        <div class="row">
          <span class="label">Correo</span>
          <span class="value">${destinatario}</span>
        </div>
        <div class="row">
          <span class="label">Contraseña temporal</span>
          <span class="value">${passwordTemporal}</span>
        </div>
      </div>
      <div class="warning">
        ⚠️ Al ingresar por primera vez se te pedirá que cambies la contraseña obligatoriamente.
      </div>
      <a href="${APP_URL}/login" class="btn">Ingresar al sistema</a>
    </div>
    <div class="footer">
      Este es un correo automático del Sistema ISBA. No respondas a este mensaje.
    </div>
  </div>
</body>
</html>`.trim()

  await transport.sendMail({
    from: `Sistema ISBA <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: 'Tu cuenta en Sistema ISBA fue aprobada',
    html,
  })
}
