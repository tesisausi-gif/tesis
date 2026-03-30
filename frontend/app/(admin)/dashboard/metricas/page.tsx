import { getMetricasDashboard } from '@/features/incidentes/incidentes.service'
import { getReportesCompletos } from '@/features/reportes/reportes.service'
import { MetricasContent } from '@/components/admin/metricas-content.client'

export const dynamic = 'force-dynamic'

export default async function MetricasPage() {
  const [metricas, reportes] = await Promise.all([
    getMetricasDashboard(),
    getReportesCompletos(),
  ])

  return <MetricasContent metricas={metricas} reportes={reportes} />
}
