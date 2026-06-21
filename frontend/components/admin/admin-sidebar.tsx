'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  FileText,
  Users,
  Wrench,
  DollarSign,
  FileCheck,
  Settings,
  LogOut,
  UserCog,
  BarChart2,
  ClipboardCheck,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
import { createClient } from '@/shared/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getAdminBadgeCounts } from '@/features/notificaciones/badge-counts.service'
import type { AdminBadgeCounts } from '@/features/notificaciones/badge-counts.service'

type BadgeKey = keyof AdminBadgeCounts

const menuItems: { title: string; icon: React.ElementType; href: string; badge?: BadgeKey; hidden?: boolean }[] = [
  { title: 'Inicio',         icon: Home,          href: '/dashboard' },
  { title: 'Incidentes',     icon: FileText,       href: '/dashboard/incidentes',    badge: 'incidentes' },
  { title: 'Clientes',       icon: Users,          href: '/dashboard/clientes' },
  { title: 'Técnicos',       icon: Wrench,         href: '/dashboard/tecnicos',       badge: 'solicitudes' },
  { title: 'Empleados',      icon: UserCog,        href: '/dashboard/usuarios',       hidden: true },
  { title: 'Presupuestos',   icon: DollarSign,     href: '/dashboard/presupuestos',  badge: 'presupuestos' },
  { title: 'Conformidades',  icon: ClipboardCheck, href: '/dashboard/conformidades', badge: 'conformidades' },
  { title: 'Cobros y Pagos', icon: FileCheck,      href: '/dashboard/pagos',          badge: 'pagos' },
  { title: 'Indicadores',    icon: BarChart2,      href: '/dashboard/metricas' },
]

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const { isMobile, setOpenMobile } = useSidebar()

  const closeSidebarOnMobile = () => { if (isMobile) setOpenMobile(false) }
  const [counts, setCounts] = useState<AdminBadgeCounts>({ incidentes: 0, conformidades: 0, presupuestos: 0, pagos: 0, solicitudes: 0, reasignaciones: 0, notificaciones: 0 })

  useEffect(() => {
    const supabase = supabaseRef.current

    // Igual que el tab de pendientes: actualiza badges Y refresca los server components
    // de la página actual para que el contenido también muestre los datos nuevos
    const refresh = () => {
      getAdminBadgeCounts().then(setCounts).catch(() => {})
      router.refresh()
    }

    // Carga inicial (sin router.refresh — la página ya tiene datos frescos del SSR)
    getAdminBadgeCounts().then(setCounts).catch(() => {})

    // Evento explícito para forzar refresh tras acciones del admin
    window.addEventListener('admin-badges-refresh', refresh)

    // Suscripciones realtime — mismas tablas que el tab de pendientes + cobros/pagos
    const channel = supabase
      .channel('admin-badges-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidentes' },          refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asignaciones_tecnico' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presupuestos' },         refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conformidades' },        refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobros_clientes' },      refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_tecnicos' },       refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_registro' }, refresh)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('admin-badges-refresh', refresh)
    }
  }, [router])

  const handleLogout = async () => {
    await supabaseRef.current.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-4 py-4">
            <div className="flex items-center gap-2">
              <img src="/mantis-icon.png" alt="Mantis" width={28} height={28} className="rounded-md" />
              Mantis
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.filter(item => !item.hidden).map((item) => {
                const badgeCount = item.badge ? counts[item.badge] : 0
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                    >
                      <Link href={item.href} className="flex items-center gap-2 w-full" onClick={closeSidebarOnMobile}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        <NavBadge count={badgeCount} />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/configuracion" onClick={closeSidebarOnMobile}>
                <Settings className="h-4 w-4" />
                <span>Configuración</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
