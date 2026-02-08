'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, ClipboardList, User, LogOut, Wrench, FileText, Search } from 'lucide-react'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const navItems = [
  {
    title: 'Inicio',
    icon: Home,
    href: '/tecnico',
  },
  {
    title: 'Asignación',
    icon: Search,
    href: '/tecnico/disponibles',
    showBadge: true, // Mostrar badge de notificación
  },
  {
    title: 'Trabajos',
    icon: ClipboardList,
    href: '/tecnico/trabajos',
  },
  {
    title: 'Presupuestos',
    icon: FileText,
    href: '/tecnico/presupuestos',
  },
  {
    title: 'Perfil',
    icon: User,
    href: '/tecnico/perfil',
  },
]

function TecnicoNavComponent() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [pendingCount, setPendingCount] = useState(0)

  // Cargar contador de asignaciones pendientes
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: usuario } = await supabase
          .from('usuarios')
          .select('id_tecnico')
          .eq('id', user.id)
          .single()

        if (!usuario?.id_tecnico) return

        const { count, error } = await supabase
          .from('asignaciones_tecnico')
          .select('*', { count: 'exact', head: true })
          .eq('id_tecnico', usuario.id_tecnico)
          .eq('estado_asignacion', 'pendiente')

        if (!error && count !== null) {
          setPendingCount(count)
        }
      } catch (error) {
        console.error('Error cargando contador:', error)
      }
    }

    loadPendingCount()

    // Suscribirse a cambios en asignaciones
    const channel = supabase
      .channel('asignaciones_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asignaciones_tecnico',
        },
        () => {
          loadPendingCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

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
          <Wrench className="h-5 w-5 text-blue-600" />
          <h1 className="font-semibold text-lg">Portal Técnico</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5 text-red-600" />
        </Button>
      </header>

      {/* Bottom navigation for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-white shadow-lg pb-safe">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-1 py-3 px-4 transition-colors ${isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
                  }`}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {/* Badge de notificación estilo Instagram */}
                  {item.showBadge && pendingCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.title}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export const TecnicoNav = memo(TecnicoNavComponent)
