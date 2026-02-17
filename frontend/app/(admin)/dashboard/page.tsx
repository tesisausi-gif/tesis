import { getDashboardStats, getDashboardActividad } from '@/features/incidentes/incidentes.service'
import { DashboardContent } from '@/components/admin/dashboard-content.client'

export default async function DashboardPage() {
  const [stats, actividad] = await Promise.all([
    getDashboardStats(),
    getDashboardActividad(),
  ])

  return (
    <DashboardContent
      stats={stats}
      incidentesRecientes={actividad.incidentesRecientes as any}
      asignacionesRecientes={actividad.asignacionesRecientes as any}
    />
  )
}
