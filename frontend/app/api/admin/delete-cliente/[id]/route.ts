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
    } else {
      console.log(`Eliminando cliente ${idCliente} sin usuario asociado (cliente huérfano)...`)
    }

    // 2. Eliminar de tabla clientes
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

    // 3. Si existe usuario asociado, eliminarlo de Auth (esto CASCADE a usuarios)
    if (usuario) {
      const { error: authError } = await supabase.auth.admin.deleteUser(usuario.id)

      if (authError) {
        console.error('Error al eliminar usuario de Auth:', authError)
        // No retornamos error porque el cliente ya se eliminó
        console.log('⚠️  Cliente eliminado pero hubo error al eliminar usuario de Auth')
      } else {
        console.log('✓ Usuario eliminado de auth.users y usuarios')
      }
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
