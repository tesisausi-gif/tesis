'use server'

import { createAdminClient } from '@/shared/lib/supabase/admin'
import { enviarCodigoVerificacionEmail } from '@/features/email/email.service'
import type { ActionResult } from '@/shared/types'

function generarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Genera un código de 6 dígitos, lo guarda en la tabla clientes y envía el email.
 * Puede llamarse al entrar al portal por primera vez o al pedir reenvío.
 */
export async function enviarCodigoVerificacion(
  idCliente: number,
  email: string,
  nombre: string,
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()
    const codigo = generarCodigo()
    const expira = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hora

    const { error } = await supabase
      .from('clientes')
      .update({
        codigo_verificacion: codigo,
        codigo_verificacion_expira: expira,
      })
      .eq('id_cliente', idCliente)

    if (error) return { success: false, error: error.message }

    await enviarCodigoVerificacionEmail({ destinatario: email, nombre, codigo })

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al enviar el código' }
  }
}

/**
 * Valida el código ingresado por el cliente.
 * Si es correcto y no expiró, marca email_verificado = true y limpia el código.
 */
export async function verificarCodigoEmail(
  idCliente: number,
  codigoIngresado: string,
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()

    const { data: cliente } = await supabase
      .from('clientes')
      .select('codigo_verificacion, codigo_verificacion_expira')
      .eq('id_cliente', idCliente)
      .maybeSingle()

    if (!cliente?.codigo_verificacion) {
      return { success: false, error: 'No hay un código activo. Pedí uno nuevo.' }
    }

    if (new Date() > new Date(cliente.codigo_verificacion_expira)) {
      return { success: false, error: 'El código expiró. Pedí uno nuevo.' }
    }

    if (cliente.codigo_verificacion !== codigoIngresado.trim()) {
      return { success: false, error: 'Código incorrecto. Revisá el email.' }
    }

    await supabase
      .from('clientes')
      .update({
        email_verificado: true,
        codigo_verificacion: null,
        codigo_verificacion_expira: null,
      })
      .eq('id_cliente', idCliente)

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error al verificar el código' }
  }
}

/**
 * Retorna si el cliente ya verificó su email.
 */
export async function getEmailVerificado(idCliente: number): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clientes')
    .select('email_verificado')
    .eq('id_cliente', idCliente)
    .maybeSingle()
  return data?.email_verificado === true
}
