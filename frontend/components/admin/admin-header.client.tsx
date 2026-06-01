'use client'

import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':               'Inicio',
  '/dashboard/incidentes':    'Incidentes',
  '/dashboard/clientes':      'Clientes',
  '/dashboard/tecnicos':      'Técnicos',
  '/dashboard/usuarios':      'Empleados',
  '/dashboard/presupuestos':  'Presupuestos',
  '/dashboard/conformidades': 'Conformidades',
  '/dashboard/pagos':         'Pagos',
  '/dashboard/metricas':      'Indicadores',
  '/dashboard/configuracion': 'Configuración',
  '/dashboard/reportes':      'Reportes',
  '/dashboard/exportar':      'Exportar',
}

export function AdminHeader() {
  const pathname = usePathname()
  const basePath = '/' + pathname.split('/').slice(1, 3).join('/')
  const title = PAGE_TITLES[basePath] ?? 'Dashboard'

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background/95 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="h-4 w-px bg-border" />
      <span className="text-sm font-semibold text-foreground">{title}</span>
    </header>
  )
}
