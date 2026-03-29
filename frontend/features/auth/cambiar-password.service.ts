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

    // Cambiar contraseña en Supabase Auth
    const { error: pwError } = await supabase.auth.updateUser({ password: nuevaPassword })
    if (pwError) return { success: false, error: pwError.message }

    // Desactivar flag (requiere admin client para bypass RLS)
    const admin = createAdminClient()
    const { error: flagError } = await admin
      .from('usuarios')
      .update({ debe_cambiar_password: false })
      .eq('id', user.id)

    if (flagError) return { success: false, error: flagError.message }

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Error inesperado al cambiar contraseña' }
  }
}
