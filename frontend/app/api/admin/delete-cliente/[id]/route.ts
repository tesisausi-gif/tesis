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

    // 1. Buscar el usuario asociado al cliente (puede no existir para clientes antiguos)
    const { data: usuarios, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id_cliente', idCliente)

    const usuario = usuarios?.[0] || null

    if (usuarioError && usuarioError.code !== 'PGRST116') {
      console.error('Error al buscar usuario:', usuarioError)
    }

    if (usuario) {
      console.log(`Eliminando cliente ${idCliente} con usuario asociado ${usuario.id}...`)

      // 2. Primero eliminar de Auth (esto hace CASCADE a usuarios, eliminando la FK constraint)
      const { error: authError } = await supabase.auth.admin.deleteUser(usuario.id)

      if (authError) {
        console.error('Error al eliminar usuario de Auth:', authError)
        return NextResponse.json(
          { error: `Error al eliminar usuario de Auth: ${authError.message}` },
          { status: 400 }
        )
      }

      console.log('✓ Usuario eliminado de auth.users y usuarios (CASCADE)')

      // 3. Ahora eliminar de tabla clientes (ya no hay FK constraint)
      const { error: clienteError } = await supabase
        .from('clientes')
        .delete()
        .eq('id_cliente', idCliente)

      if (clienteError) {
        console.error('Error al eliminar cliente:', clienteError)
        return NextResponse.json(
          { error: `Error al eliminar cliente: ${clienteError.message}` },
          { status: 400 }
        )
      }

      console.log('✓ Cliente eliminado de tabla clientes')
    } else {
      console.log(`Eliminando cliente ${idCliente} sin usuario asociado (cliente huérfano)...`)

      // Si no hay usuario asociado, solo eliminar de clientes
      const { error: clienteError } = await supabase
        .from('clientes')
        .delete()
        .eq('id_cliente', idCliente)

      if (clienteError) {
        console.error('Error al eliminar cliente:', clienteError)
        return NextResponse.json(
          { error: `Error al eliminar cliente: ${clienteError.message}` },
          { status: 400 }
        )
      }

      console.log('✓ Cliente huérfano eliminado de tabla clientes')
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
