import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { solicitudId, password } = await request.json()

    if (!solicitudId || !password) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
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

    // 1. Obtener la solicitud
    const { data: solicitud, error: solicitudError } = await supabase
      .from('solicitudes_registro')
      .select('*')
      .eq('id_solicitud', solicitudId)
      .single()

    if (solicitudError || !solicitud) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    // 2. Crear usuario en Supabase Auth
    // El trigger handle_new_user() se encargará automáticamente de:
    // - Crear registro en public.tecnicos
    // - Crear registro en public.usuarios con la referencia correcta
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: solicitud.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre: solicitud.nombre,
        apellido: solicitud.apellido,
        rol: 'tecnico',
        telefono: solicitud.telefono,
        dni: solicitud.dni,
        especialidad: solicitud.especialidad,
        direccion: solicitud.direccion
      }
    })

    if (authError) {
      console.error('Error al crear usuario en Auth:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // El trigger ya creó los registros en tecnicos y usuarios
    // Solo verificamos que se hayan creado correctamente
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('*, tecnicos(*)')
      .eq('id', authData.user.id)
      .single()

    if (usuarioError) {
      console.error('Error al verificar usuario creado:', usuarioError)
    }

    // 5. Actualizar solicitud como aprobada
    const { error: updateError } = await supabase
      .from('solicitudes_registro')
      .update({
        estado_solicitud: 'aprobada',
        fecha_aprobacion: new Date().toISOString()
      })
      .eq('id_solicitud', solicitudId)

    if (updateError) {
      console.error('Error al actualizar solicitud:', updateError)
    }

    // TODO: Enviar email al técnico con sus credenciales

    return NextResponse.json({
      success: true,
      message: 'Técnico aprobado correctamente',
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    })

  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al aprobar técnico' },
      { status: 500 }
    )
  }
}
