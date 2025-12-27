'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  FileText,
  Users,
  Building2,
  Wrench,
  DollarSign,
  FileCheck,
  Star,
  Settings,
  LogOut,
  UserCog,
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
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const menuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    href: '/dashboard',
  },
  {
    title: 'Incidentes',
    icon: FileText,
    href: '/dashboard/incidentes',
  },
  {
    title: 'Propiedades',
    icon: Building2,
    href: '/dashboard/propiedades',
  },
  {
    title: 'Clientes',
    icon: Users,
    href: '/dashboard/clientes',
  },
  {
    title: 'Técnicos',
    icon: Wrench,
    href: '/dashboard/tecnicos',
  },
  {
    title: 'Especialidades',
    icon: Settings,
    href: '/dashboard/especialidades',
  },
  {
    title: 'Solicitudes',
    icon: Users,
    href: '/dashboard/solicitudes',
  },
  {
    title: 'Empleados',
    icon: UserCog,
    href: '/dashboard/usuarios',
  },
  {
    title: 'Presupuestos',
    icon: DollarSign,
    href: '/dashboard/presupuestos',
  },
  {
    title: 'Pagos',
    icon: FileCheck,
    href: '/dashboard/pagos',
  },
  {
    title: 'Calificaciones',
    icon: Star,
    href: '/dashboard/calificaciones',
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
