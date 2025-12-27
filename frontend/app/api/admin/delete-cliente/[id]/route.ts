import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCliente = parseInt(id)

    if (!idCliente || isNaN(idCliente)) {
      return NextResponse.json(
        { error: 'ID de cliente inválido' },
        { status: 400 }
      )
    }

    // Crear cliente de Supabase con service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Buscar el usuario asociado al cliente
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id_cliente', idCliente)
      .single()

    if (usuarioError || !usuario) {
      console.error('Error al buscar usuario:', usuarioError)
      return NextResponse.json(
        { error: 'No se encontró el usuario asociado al cliente' },
        { status: 404 }
      )
    }

    // 2. Eliminar de tabla usuarios (cascade eliminará el cliente)
    await supabase
      .from('usuarios')
      .delete()
      .eq('id', usuario.id)

    // 3. Eliminar de Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(usuario.id)

    if (authError) {
      console.error('Error al eliminar usuario de Auth:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado correctamente'
    })

  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al eliminar cliente' },
      { status: 500 }
    )
  }
}
