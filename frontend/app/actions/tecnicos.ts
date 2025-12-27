'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function eliminarTecnico(idTecnico: number) {
  try {
    // Usar el cliente de servidor con SERVICE_ROLE_KEY para operaciones admin
    const supabase = await createClient()

    // Primero, obtener el usuario asociado al técnico
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id_tecnico', idTecnico)
      .single()

    if (usuarioError && usuarioError.code !== 'PGRST116') {
      console.error('Error al buscar usuario:', usuarioError)
      return {
        success: false,
        error: 'Error al buscar el usuario asociado'
      }
    }

    // Si existe un usuario asociado, eliminarlo de auth
    if (usuario) {
      // Crear cliente con SERVICE_ROLE_KEY para operaciones admin
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')

      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
        usuario.id
      )

      if (deleteAuthError) {
        console.error('Error al eliminar usuario de auth:', deleteAuthError)
        // Continuar con la eliminación del técnico aunque falle auth
      }
    }

    // Eliminar el técnico (esto activará el CASCADE)
    const { error: deleteTecnicoError } = await supabase
      .from('tecnicos')
      .delete()
      .eq('id_tecnico', idTecnico)

    if (deleteTecnicoError) {
      console.error('Error al eliminar técnico:', deleteTecnicoError)
      return {
        success: false,
        error: 'Error al eliminar el técnico de la base de datos'
      }
    }

    // Revalidar la ruta para actualizar los datos
    revalidatePath('/dashboard/tecnicos')

    return {
      success: true,
      message: 'Técnico eliminado correctamente'
    }
  } catch (error) {
    console.error('Error inesperado:', error)
    return {
      success: false,
      error: 'Error inesperado al eliminar el técnico'
    }
  }
}
