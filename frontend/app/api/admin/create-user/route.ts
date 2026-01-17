import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      nombre,
      apellido,
      rol,
      telefono,
      dni,
      direccion,
      especialidad
    } = await request.json()

    // Validaciones
    if (!email || !password || !nombre || !apellido || !rol) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
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

    // Verificar si el email ya existe
    const { data: existingUsers, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('correo_electronico', email)
      .limit(1)

    if (checkError) {
      console.error('Error al verificar email:', checkError)
      // Continuar aunque haya error en la verificación
    } else if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Este correo electrónico ya está registrado en el sistema' },
        { status: 400 }
      )
    }

    // 1. Crear usuario en Supabase Auth
    // El trigger handle_new_user() se encargará automáticamente de:
    // - Crear registro en public.usuarios
    // - Crear registro en public.clientes (si rol='cliente')
    // - Crear registro en public.tecnicos (si rol='tecnico')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellido,
        rol,
        telefono,
        dni,
        direccion,
        especialidad
      }
    })

    if (authError) {
      console.error('Error al crear usuario en Auth:', authError)
      // Mejorar mensaje de error para emails duplicados
      if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Este correo electrónico ya está registrado en el sistema' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'No se pudo crear el usuario' },
        { status: 500 }
      )
    }

    // El trigger ya creó los registros necesarios
    // Verificamos que se hayan creado correctamente
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (usuarioError) {
      console.error('Error al verificar usuario creado:', usuarioError)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        rol: usuarioData?.rol
      }
    })

  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear usuario' },
      { status: 500 }
    )
  }
}
