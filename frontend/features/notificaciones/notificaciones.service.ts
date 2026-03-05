'use server'

/**
 * Servicio de Notificaciones por Email — Brevo REST API
 * Todas las funciones son fire-and-forget: el caller debe hacer .catch(console.error)
 * para que fallas de email no bloqueen la operación principal.
 */

import { createAdminClient } from '@/shared/lib/supabase/admin'

// ─── API Brevo ────────────────────────────────────────────────────────────────

async function sendEmail(
  to: { email: string; name: string },
  subject: string,
  htmlContent: string,
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return // En desarrollo sin configurar, no falla

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@isba.com'
  const senderName = process.env.BREVO_SENDER_NAME || 'ISBA - Sistema de Gestión'

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [to],
      subject,
      htmlContent,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Brevo error ${res.status}: ${body}`)
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

function plantillaBase(titulo: string, saludo: string, cuerpo: string, cta?: { texto: string; url: string }): string {
  const ctaHtml = cta
    ? `<tr><td style="padding:24px 0 0;">
        <a href="${cta.url}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:600;">${cta.texto}</a>
       </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:#1d4ed8;padding:24px 32px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">ISBA</p>
          <p style="margin:4px 0 0;color:#bfdbfe;font-size:12px;">Sistema de Gestión de Incidentes</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td>
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">${titulo}</p>
              <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">${saludo}</p>
              <div style="font-size:14px;color:#374151;line-height:1.6;">${cuerpo}</div>
            </td></tr>
            ${ctaHtml}
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Este mensaje fue enviado automáticamente por el Sistema de Gestión de Incidentes ISBA. Por favor no respondas este email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function fila(label: string, valor: string): string {
  return `<tr>
    <td style="padding:4px 0;font-weight:600;color:#6b7280;font-size:13px;width:160px;">${label}</td>
    <td style="padding:4px 0;color:#111827;font-size:13px;">${valor}</td>
  </tr>`
}

function tablaDatos(filas: string[]): string {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;padding:12px 16px;margin:16px 0;">${filas.join('')}</table>`
}

// ─── Evento 1: Nueva asignación → email al técnico ───────────────────────────

export async function notificarNuevaAsignacion(
  idIncidente: number,
  idTecnico: number,
): Promise<void> {
  const supabase = createAdminClient()

  const [tecRes, incRes] = await Promise.all([
    supabase
      .from('tecnicos')
      .select('nombre, apellido, correo_electronico')
      .eq('id_tecnico', idTecnico)
      .single(),
    supabase
      .from('incidentes')
      .select('id_incidente, descripcion_problema, categoria, nivel_prioridad, inmuebles:id_propiedad (calle, altura, localidad)')
      .eq('id_incidente', idIncidente)
      .single(),
  ])

  const tec = tecRes.data
  if (!tec?.correo_electronico) return

  const inc = incRes.data
  const inm = inc?.inmuebles as any
  const direccion = inm ? `${inm.calle || ''} ${inm.altura || ''}, ${inm.localidad || ''}`.trim() : 'Sin datos'

  const html = plantillaBase(
    'Nueva asignación de incidente',
    `Hola ${tec.nombre}, se te asignó un nuevo incidente para atender.`,
    tablaDatos([
      fila('Incidente #', String(inc?.id_incidente || '')),
      fila('Descripción', inc?.descripcion_problema || ''),
      fila('Categoría', inc?.categoria || ''),
      fila('Prioridad', inc?.nivel_prioridad || ''),
      fila('Dirección', direccion),
    ]),
  )

  await sendEmail(
    { email: tec.correo_electronico, name: `${tec.nombre} ${tec.apellido}` },
    `[ISBA] Nueva asignación: Incidente #${inc?.id_incidente}`,
    html,
  )
}

// ─── Evento 2: Presupuesto creado → email al cliente ─────────────────────────

export async function notificarPresupuestoCreado(idPresupuesto: number): Promise<void> {
  const supabase = createAdminClient()

  const { data: pres } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto, descripcion_detallada, costo_total, estado_presupuesto,
      incidentes (id_incidente, descripcion_problema, clientes:id_cliente_reporta (nombre, apellido, correo_electronico))
    `)
    .eq('id_presupuesto', idPresupuesto)
    .single()

  const inc = pres?.incidentes as any
  const cliente = inc?.clientes
  if (!cliente?.correo_electronico) return

  const AR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

  const html = plantillaBase(
    'Presupuesto disponible para revisión',
    `Estimado/a ${cliente.nombre}, hay un presupuesto listo para su revisión.`,
    tablaDatos([
      fila('Presupuesto #', String(pres?.id_presupuesto || '')),
      fila('Incidente #', String(inc?.id_incidente || '')),
      fila('Descripción', pres?.descripcion_detallada || inc?.descripcion_problema || ''),
      fila('Costo total', AR.format(pres?.costo_total || 0)),
    ]) + `<p style="font-size:13px;color:#374151;margin:0;">Ingresá al sistema para revisar y aprobar el presupuesto.</p>`,
  )

  await sendEmail(
    { email: cliente.correo_electronico, name: `${cliente.nombre} ${cliente.apellido}` },
    `[ISBA] Presupuesto #${pres?.id_presupuesto} listo para revisar`,
    html,
  )
}

// ─── Evento 3: Presupuesto aprobado por admin → email al cliente ──────────────

export async function notificarPresupuestoAprobadoAdmin(idPresupuesto: number): Promise<void> {
  const supabase = createAdminClient()

  const { data: pres } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto, costo_total,
      incidentes (id_incidente, descripcion_problema, clientes:id_cliente_reporta (nombre, apellido, correo_electronico))
    `)
    .eq('id_presupuesto', idPresupuesto)
    .single()

  const inc = pres?.incidentes as any
  const cliente = inc?.clientes
  if (!cliente?.correo_electronico) return

  const AR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

  const html = plantillaBase(
    'Presupuesto aprobado — su aprobación requerida',
    `Estimado/a ${cliente.nombre}, el equipo de ISBA aprobó el presupuesto de su incidente. Ahora requiere su confirmación.`,
    tablaDatos([
      fila('Presupuesto #', String(pres?.id_presupuesto || '')),
      fila('Incidente #', String(inc?.id_incidente || '')),
      fila('Descripción', inc?.descripcion_problema || ''),
      fila('Costo total', AR.format(pres?.costo_total || 0)),
    ]) + `<p style="font-size:13px;color:#374151;margin:0;">Por favor ingresá al sistema para confirmar el presupuesto y dar inicio a los trabajos.</p>`,
  )

  await sendEmail(
    { email: cliente.correo_electronico, name: `${cliente.nombre} ${cliente.apellido}` },
    `[ISBA] Se requiere su aprobación — Presupuesto #${pres?.id_presupuesto}`,
    html,
  )
}

// ─── Evento 4: Presupuesto rechazado → email al cliente ──────────────────────

export async function notificarPresupuestoRechazado(idPresupuesto: number): Promise<void> {
  const supabase = createAdminClient()

  const { data: pres } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto, costo_total,
      incidentes (id_incidente, descripcion_problema, clientes:id_cliente_reporta (nombre, apellido, correo_electronico))
    `)
    .eq('id_presupuesto', idPresupuesto)
    .single()

  const inc = pres?.incidentes as any
  const cliente = inc?.clientes
  if (!cliente?.correo_electronico) return

  const html = plantillaBase(
    'Presupuesto rechazado',
    `Estimado/a ${cliente.nombre}, el presupuesto de su incidente fue rechazado.`,
    tablaDatos([
      fila('Presupuesto #', String(pres?.id_presupuesto || '')),
      fila('Incidente #', String(inc?.id_incidente || '')),
      fila('Descripción', inc?.descripcion_problema || ''),
    ]) + `<p style="font-size:13px;color:#374151;margin:0;">El equipo de ISBA revisará su caso y se pondrá en contacto. También puede comunicarse directamente con nosotros.</p>`,
  )

  await sendEmail(
    { email: cliente.correo_electronico, name: `${cliente.nombre} ${cliente.apellido}` },
    `[ISBA] Presupuesto #${pres?.id_presupuesto} rechazado`,
    html,
  )
}

// ─── Evento 5: Incidente resuelto → email al cliente ─────────────────────────

export async function notificarIncidenteResuelto(idIncidente: number): Promise<void> {
  const supabase = createAdminClient()

  const { data: inc } = await supabase
    .from('incidentes')
    .select(`
      id_incidente, descripcion_problema, categoria,
      inmuebles:id_propiedad (calle, altura, localidad),
      clientes:id_cliente_reporta (nombre, apellido, correo_electronico)
    `)
    .eq('id_incidente', idIncidente)
    .single()

  const cliente = inc?.clientes as any
  if (!cliente?.correo_electronico) return

  const inm = inc?.inmuebles as any
  const direccion = inm ? `${inm.calle || ''} ${inm.altura || ''}, ${inm.localidad || ''}`.trim() : ''

  const html = plantillaBase(
    '¡Su incidente fue resuelto!',
    `Estimado/a ${cliente.nombre}, nos complace informarle que su incidente fue resuelto satisfactoriamente.`,
    tablaDatos([
      fila('Incidente #', String(inc?.id_incidente || '')),
      fila('Descripción', inc?.descripcion_problema || ''),
      fila('Categoría', inc?.categoria || ''),
      ...(direccion ? [fila('Propiedad', direccion)] : []),
    ]) + `<p style="font-size:13px;color:#374151;margin:0;">Si tiene alguna consulta o considera que el problema persiste, por favor contacte a ISBA.</p>`,
  )

  await sendEmail(
    { email: cliente.correo_electronico, name: `${cliente.nombre} ${cliente.apellido}` },
    `[ISBA] Incidente #${inc?.id_incidente} resuelto`,
    html,
  )
}

// ─── Evento 6: Nuevo avance → email al cliente ────────────────────────────────

export async function notificarNuevoAvance(
  idAvance: number,
  idIncidente: number,
): Promise<void> {
  const supabase = createAdminClient()

  const [avRes, incRes] = await Promise.all([
    supabase
      .from('avances')
      .select('descripcion_avance, porcentaje_completado')
      .eq('id_avance', idAvance)
      .single(),
    supabase
      .from('incidentes')
      .select('id_incidente, descripcion_problema, clientes:id_cliente_reporta (nombre, apellido, correo_electronico)')
      .eq('id_incidente', idIncidente)
      .single(),
  ])

  const inc = incRes.data
  const cliente = inc?.clientes as any
  if (!cliente?.correo_electronico) return

  const av = avRes.data

  const html = plantillaBase(
    'Nuevo avance en su incidente',
    `Estimado/a ${cliente.nombre}, hay un nuevo avance registrado en su incidente.`,
    tablaDatos([
      fila('Incidente #', String(inc?.id_incidente || '')),
      fila('Descripción del avance', av?.descripcion_avance || ''),
      ...(av?.porcentaje_completado != null ? [fila('Progreso', `${av.porcentaje_completado}%`)] : []),
    ]),
  )

  await sendEmail(
    { email: cliente.correo_electronico, name: `${cliente.nombre} ${cliente.apellido}` },
    `[ISBA] Avance registrado — Incidente #${inc?.id_incidente}`,
    html,
  )
}

// ─── Evento 7: Pago registrado → email al cliente ─────────────────────────────

export async function notificarPagoRegistrado(idPago: number): Promise<void> {
  const supabase = createAdminClient()

  const { data: pago } = await supabase
    .from('pagos')
    .select(`
      id_pago, monto_pagado, tipo_pago, metodo_pago, numero_comprobante, fecha_pago,
      incidentes (id_incidente, descripcion_problema, clientes:id_cliente_reporta (nombre, apellido, correo_electronico))
    `)
    .eq('id_pago', idPago)
    .single()

  const inc = pago?.incidentes as any
  const cliente = inc?.clientes
  if (!cliente?.correo_electronico) return

  const AR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
  const fechaStr = pago?.fecha_pago
    ? new Date(pago.fecha_pago).toLocaleDateString('es-AR')
    : new Date().toLocaleDateString('es-AR')

  const html = plantillaBase(
    'Confirmación de pago recibido',
    `Estimado/a ${cliente.nombre}, confirmamos la recepción de su pago.`,
    tablaDatos([
      fila('Comprobante #', pago?.numero_comprobante || String(pago?.id_pago || '')),
      fila('Monto', AR.format(pago?.monto_pagado || 0)),
      fila('Tipo de pago', pago?.tipo_pago || ''),
      fila('Método', pago?.metodo_pago || ''),
      fila('Fecha', fechaStr),
      fila('Incidente #', String(inc?.id_incidente || '')),
    ]) + `<p style="font-size:13px;color:#374151;margin:0;">Guarde este email como comprobante. Ante cualquier consulta contáctese con ISBA.</p>`,
  )

  await sendEmail(
    { email: cliente.correo_electronico, name: `${cliente.nombre} ${cliente.apellido}` },
    `[ISBA] Pago confirmado — ${AR.format(pago?.monto_pagado || 0)}`,
    html,
  )
}

// ─── Evento 8: Conformidad para firmar → email al cliente ─────────────────────

export async function notificarConformidadParaFirmar(
  idConformidad: number,
  idCliente: number,
  idIncidente: number,
): Promise<void> {
  const supabase = createAdminClient()

  const [confRes, clienteRes, incRes] = await Promise.all([
    supabase
      .from('conformidades')
      .select('id_conformidad, tipo_conformidad, fecha_conformidad')
      .eq('id_conformidad', idConformidad)
      .single(),
    supabase
      .from('clientes')
      .select('nombre, apellido, correo_electronico')
      .eq('id_cliente', idCliente)
      .single(),
    supabase
      .from('incidentes')
      .select('id_incidente, descripcion_problema')
      .eq('id_incidente', idIncidente)
      .single(),
  ])

  const cliente = clienteRes.data
  if (!cliente?.correo_electronico) return

  const conf = confRes.data
  const inc = incRes.data
  const tipoLabel = conf?.tipo_conformidad === 'final' ? 'Final' : 'Intermedia'

  const html = plantillaBase(
    `Conformidad ${tipoLabel} lista para su firma`,
    `Estimado/a ${cliente.nombre}, hay una conformidad ${tipoLabel.toLowerCase()} pendiente de su firma.`,
    tablaDatos([
      fila('Conformidad #', String(conf?.id_conformidad || '')),
      fila('Tipo', tipoLabel),
      fila('Incidente #', String(inc?.id_incidente || '')),
      fila('Descripción', inc?.descripcion_problema || ''),
    ]) + `<p style="font-size:13px;color:#374151;margin:0;">Por favor ingresá al sistema para revisar y firmar la conformidad.</p>`,
  )

  await sendEmail(
    { email: cliente.correo_electronico, name: `${cliente.nombre} ${cliente.apellido}` },
    `[ISBA] Conformidad ${tipoLabel} lista para firmar — Incidente #${inc?.id_incidente}`,
    html,
  )
}

// ─── Evento 9: Presupuesto aprobado por admin → email al técnico ──────────────

export async function notificarTecnicoPresupuestoAprobado(idPresupuesto: number): Promise<void> {
  const supabase = createAdminClient()

  const { data: pres } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto, costo_total, gastos_administrativos,
      incidentes (
        id_incidente, descripcion_problema,
        asignaciones_tecnico (
          id_tecnico, estado_asignacion,
          tecnicos (nombre, apellido, correo_electronico)
        )
      )
    `)
    .eq('id_presupuesto', idPresupuesto)
    .single()

  const inc = pres?.incidentes as any
  const asig = Array.isArray(inc?.asignaciones_tecnico)
    ? inc.asignaciones_tecnico.find((a: any) => ['aceptada', 'en_curso', 'pendiente'].includes(a.estado_asignacion))
    : null
  const tec = asig?.tecnicos
  if (!tec?.correo_electronico) return

  const html = plantillaBase(
    'Presupuesto aprobado — puede comenzar el trabajo',
    `Hola ${tec.nombre}, tu presupuesto fue aprobado por la administración.`,
    tablaDatos([
      fila('Presupuesto #', String(pres?.id_presupuesto)),
      fila('Incidente #', String(inc?.id_incidente)),
      fila('Descripción', inc?.descripcion_problema || ''),
      fila('Total aprobado', `$${Number(pres?.costo_total).toLocaleString('es-AR')}`),
    ]),
  )

  await sendEmail(
    { email: tec.correo_electronico, name: `${tec.nombre} ${tec.apellido}` },
    `[ISBA] Presupuesto #${pres?.id_presupuesto} aprobado — puede iniciar el trabajo`,
    html,
  )
}

// ─── Evento 10: Presupuesto rechazado por admin → email al técnico ────────────

export async function notificarTecnicoPresupuestoRechazado(idPresupuesto: number): Promise<void> {
  const supabase = createAdminClient()

  const { data: pres } = await supabase
    .from('presupuestos')
    .select(`
      id_presupuesto,
      incidentes (
        id_incidente, descripcion_problema,
        asignaciones_tecnico (
          id_tecnico, estado_asignacion,
          tecnicos (nombre, apellido, correo_electronico)
        )
      )
    `)
    .eq('id_presupuesto', idPresupuesto)
    .single()

  const inc = pres?.incidentes as any
  const asig = Array.isArray(inc?.asignaciones_tecnico)
    ? inc.asignaciones_tecnico.find((a: any) => ['aceptada', 'en_curso', 'pendiente', 'rechazada'].includes(a.estado_asignacion))
    : null
  const tec = asig?.tecnicos
  if (!tec?.correo_electronico) return

  const html = plantillaBase(
    'Presupuesto rechazado por la administración',
    `Hola ${tec.nombre}, lamentablemente tu presupuesto no fue aprobado por la administración.`,
    tablaDatos([
      fila('Presupuesto #', String(pres?.id_presupuesto)),
      fila('Incidente #', String(inc?.id_incidente)),
      fila('Descripción', inc?.descripcion_problema || ''),
    ]),
  )

  await sendEmail(
    { email: tec.correo_electronico, name: `${tec.nombre} ${tec.apellido}` },
    `[ISBA] Presupuesto #${pres?.id_presupuesto} rechazado`,
    html,
  )
}
