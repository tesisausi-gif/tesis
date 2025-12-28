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

  // Rutas públicas
  const publicRoutes = ['/login', '/register', '/']
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith('/register')
  )

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

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
