'use server'

import { createAdminClient } from '@/shared/lib/supabase/admin'
import { enviarPasswordTemporal } from '@/features/email/email.service'
import type { ActionResult } from '@/shared/types'

function generarPasswordTemporal(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/**
 * Recuperación de contraseña por contraseña temporal.
 *
 * Flujo:
 *   1. Valida que el email exista en la tabla usuarios
 *   2. Genera una contraseña temporal
 *   3. Actualiza la contraseña en auth.users via admin API
 *   4. Marca debe_cambiar_password = true para forzar el cambio al ingresar
 *   5. Envía la contraseña temporal por email
 */
export async function solicitarRecuperacionPassword(
  email: string,
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()
    const emailLower = email.trim().toLowerCase()

    // 1. Verificar que el email existe
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, correo_electronico')
      .ilike('correo_electronico', emailLower)
      .maybeSingle()

    if (!usuario) {
      return { success: false, error: 'No hay ninguna cuenta registrada con ese correo.' }
    }

    // 2. Generar contraseña temporal
    const passwordTemporal = generarPasswordTemporal()

    // 3. Actualizar contraseña en auth.users
    const { error: pwError } = await supabase.auth.admin.updateUserById(
      usuario.id,
      {
        password: passwordTemporal,
        user_metadata: { debe_cambiar_password: true },
      }
    )
    if (pwError) return { success: false, error: 'Error al generar la nueva contraseña.' }

    // 4. Marcar debe_cambiar_password en la tabla usuarios
    await supabase
      .from('usuarios')
      .update({ debe_cambiar_password: true })
      .eq('id', usuario.id)

    // 5. Enviar email con la contraseña temporal.
    // OJO: a esta altura la contraseña YA fue reemplazada (paso 3). Si el envío
    // falla, el mensaje debe decirlo honestamente — un "intentá de nuevo"
    // genérico dejaría al usuario sin saber que su contraseña vieja ya no sirve.
    try {
      await enviarPasswordTemporal({
        destinatario: emailLower,
        nombre: usuario.nombre ?? emailLower,
        passwordTemporal,
      })
    } catch (emailError) {
      console.error('[recuperar-password] Falló el envío del email:', emailError)
      return {
        success: false,
        error: 'Se generó una nueva contraseña pero no pudimos enviártela por email. Volvé a intentar en unos minutos: se generará otra contraseña nueva. Si sigue fallando, contactá a la administración.',
      }
    }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado. Intentá de nuevo.' }
  }
}
