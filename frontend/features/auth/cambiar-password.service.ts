'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import type { ActionResult } from '@/shared/types'

/**
 * Cambia la contraseña del usuario autenticado y desactiva el flag debe_cambiar_password.
 */
export async function cambiarPasswordObligatorio(nuevaPassword: string): Promise<ActionResult> {
  try {
    if (nuevaPassword.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' }
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    // Cambiar contraseña y limpiar flag en user_metadata (para que el layout no muestre overlay)
    const { error: pwError } = await supabase.auth.updateUser({
      password: nuevaPassword,
      data: { debe_cambiar_password: false },
    })
    if (pwError) return { success: false, error: pwError.message }

    // Limpiar flag también en la tabla usuarios
    const admin = createAdminClient()
    await admin.from('usuarios').update({ debe_cambiar_password: false }).eq('id', user.id)

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al cambiar contraseña' }
  }
}
