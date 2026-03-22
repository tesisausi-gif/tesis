'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, AlertCircle, Building2, User, LogOut, FileText, DollarSign, Bell } from 'lucide-react'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getClienteBadgeCounts } from '@/features/notificaciones/badge-counts.service'
import type { ClienteBadgeCounts } from '@/features/notificaciones/badge-counts.service'

type BadgeKey = keyof ClienteBadgeCounts

const navItems: { title: string; icon: React.ElementType; href: string; badge?: BadgeKey }[] = [
  { title: 'Inicio', icon: Home, href: '/cliente' },
  { title: 'Incidentes', icon: AlertCircle, href: '/cliente/incidentes' },
  { title: 'Alertas', icon: Bell, href: '/cliente/notificaciones', badge: 'notificaciones' as BadgeKey },
  { title: 'Inmuebles', icon: Building2, href: '/cliente/propiedades' },
  { title: 'Perfil', icon: User, href: '/cliente/perfil' },
]

function ClienteNavComponent() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [counts, setCounts] = useState<ClienteBadgeCounts>({ presupuestos: 0, pagos: 0, notificaciones: 0 })

  useEffect(() => {
    getClienteBadgeCounts()
      .then(setCounts)
      .catch(() => {})
  }, [pathname])

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
            const isActive = item.href === '/cliente'
              ? pathname === '/cliente'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            const badgeCount = item.badge ? counts[item.badge] : 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 flex-1 transition-colors ${isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
                  }`}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium truncate w-full text-center leading-tight">{item.title}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export const ClienteNav = memo(ClienteNavComponent)
