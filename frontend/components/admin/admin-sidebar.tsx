'use client'

import { useState, useEffect } from 'react'
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
} from '@/components/ui/sidebar'
import { createClient } from '@/shared/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getAdminBadgeCounts } from '@/features/notificaciones/badge-counts.service'
import type { AdminBadgeCounts } from '@/features/notificaciones/badge-counts.service'

type BadgeKey = keyof AdminBadgeCounts

const menuItems: { title: string; icon: React.ElementType; href: string; badge?: BadgeKey }[] = [
  { title: 'Dashboard', icon: Home, href: '/dashboard' },
  { title: 'Incidentes', icon: FileText, href: '/dashboard/incidentes', badge: 'incidentes' },
  { title: 'Clientes', icon: Users, href: '/dashboard/clientes' },
  { title: 'Técnicos', icon: Wrench, href: '/dashboard/tecnicos', badge: 'solicitudes' },
  { title: 'Empleados', icon: UserCog, href: '/dashboard/usuarios' },
  { title: 'Presupuestos', icon: DollarSign, href: '/dashboard/presupuestos', badge: 'presupuestos' },
  { title: 'Pagos', icon: FileCheck, href: '/dashboard/pagos', badge: 'pagos' },
  { title: 'Conformidades', icon: ClipboardCheck, href: '/dashboard/conformidades', badge: 'conformidades' },
  { title: 'Métricas e Informes', icon: BarChart2, href: '/dashboard/metricas' },
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
  const supabase = createClient()
  const [counts, setCounts] = useState<AdminBadgeCounts>({ incidentes: 0, conformidades: 0, presupuestos: 0, pagos: 0, solicitudes: 0, reasignaciones: 0, notificaciones: 0 })

  useEffect(() => {
    const refresh = () => getAdminBadgeCounts().then(setCounts).catch(() => {})

    // Carga inicial
    refresh()

    // Evento explícito para forzar refresh tras acciones del admin
    window.addEventListener('admin-badges-refresh', refresh)

    // Suscripciones realtime para actualizar badges automáticamente
    const channel = supabase
      .channel('admin-badges-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobros_clientes' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_tecnicos' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conformidades' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presupuestos' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_registro' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidentes' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asignaciones_tecnico' }, refresh)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('admin-badges-refresh', refresh)
    }
  }, []) // Solo ejecutar una vez al montar

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-4 py-4">
            Sistema ISBA
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const badgeCount = item.badge ? counts[item.badge] : 0
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                    >
                      <Link href={item.href} className="flex items-center gap-2 w-full">
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
              <Link href="/dashboard/configuracion">
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
