import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Verificar rol del usuario si está autenticado
  let userRole: string | null = null
  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()
    userRole = usuario?.rol || null
  }

  const pathname = request.nextUrl.pathname

  // Rutas protegidas por rol
  const isClienteRoute = pathname.startsWith('/cliente')
  const isTecnicoRoute = pathname.startsWith('/tecnico')
  const isAdminRoute = pathname.startsWith('/dashboard')

  // Rutas compartidas (requieren autenticación, múltiples roles permitidos)
  const isInmuebleRoute = pathname.startsWith('/inmueble')

  // Rutas públicas
  const publicRoutes = ['/login', '/register', '/']
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith('/register')
  )

  // Proteger rutas compartidas (requieren login, cualquier rol autorizado)
  if (isInmuebleRoute) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    // Solo cliente y admin pueden ver detalles de inmuebles
    if (userRole !== 'cliente' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Proteger rutas según rol
  if (isClienteRoute || isTecnicoRoute || isAdminRoute) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Verificar que el rol coincida con la ruta
    if (isClienteRoute && userRole !== 'cliente') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (isTecnicoRoute && userRole !== 'tecnico') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (isAdminRoute && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Si el usuario está autenticado y trata de acceder a login, redirigir según rol
  if (user && pathname === '/login') {
    const redirectUrl = request.nextUrl.clone()
    if (userRole === 'admin') {
      redirectUrl.pathname = '/dashboard'
    } else if (userRole === 'tecnico') {
      redirectUrl.pathname = '/tecnico'
    } else if (userRole === 'cliente') {
      redirectUrl.pathname = '/cliente'
    } else {
      redirectUrl.pathname = '/dashboard'
    }
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
