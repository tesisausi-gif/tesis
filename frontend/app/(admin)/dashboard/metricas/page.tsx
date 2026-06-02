import { getMetricasDashboard } from '@/features/incidentes/incidentes.service'
import { getReportesCompletos } from '@/features/reportes/reportes.service'
import { getTodosPpisData } from '@/features/reportes/metricas-ppis.service'
import { MetricasContent } from '@/components/admin/metricas-content.client'

export const dynamic = 'force-dynamic'

export default async function MetricasPage() {
  const [metricas, reportes, ppis] = await Promise.all([
    getMetricasDashboard(),
    getReportesCompletos(),
    getTodosPpisData(),
  ])

  return <MetricasContent metricas={metricas} reportes={reportes} ppis={ppis} />
}
