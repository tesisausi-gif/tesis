import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
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

    // Obtener todos los clientes (bypassing RLS)
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('*')
      .order('fecha_creacion', { ascending: false })

    if (error) {
      console.error('Error al obtener clientes:', error)
      return NextResponse.json(
        { error: error.message },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: clientes
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )

  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener clientes' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  }
}
