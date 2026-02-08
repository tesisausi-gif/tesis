'use client'

import { memo, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, AlertCircle, Building2, User, LogOut, FileText, DollarSign } from 'lucide-react'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const navItems = [
  {
    title: 'Inicio',
    icon: Home,
    href: '/cliente',
  },
  {
    title: 'Incidentes',
    icon: AlertCircle,
    href: '/cliente/incidentes',
  },
  {
    title: 'Presupuestos',
    icon: FileText,
    href: '/cliente/presupuestos',
  },
  {
    title: 'Pagos',
    icon: DollarSign,
    href: '/cliente/pagos',
  },
  {
    title: 'Inmuebles',
    icon: Building2,
    href: '/cliente/propiedades',
  },
  {
    title: 'Perfil',
    icon: User,
    href: '/cliente/perfil',
  },
]

function ClienteNavComponent() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Error al cerrar sesión')
    } else {
      toast.success('Sesión cerrada exitosamente')
      router.push('/login')
      router.refresh()
    }
  }, [router, supabase])

  return (
    <>
      {/* Top bar for mobile */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-white shadow-sm px-4">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h1 className="font-semibold text-lg">Portal Cliente</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5 text-red-600" />
        </Button>
      </header>

      {/* Bottom navigation for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-white shadow-lg pb-safe">
        <div className="flex justify-around">
          {navItems.map((item) => {
            // Para el inicio (/cliente), solo marcar activo si es exactamente esa ruta
            // Para otras rutas, marcar activo si coincide exactamente o si es una subruta
            const isActive = item.href === '/cliente'
              ? pathname === '/cliente'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-3 px-4 transition-colors ${isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
                  }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.title}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export const ClienteNav = memo(ClienteNavComponent)
