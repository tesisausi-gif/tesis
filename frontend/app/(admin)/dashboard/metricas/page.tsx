import { getMetricasDashboard } from '@/features/incidentes/incidentes.service'
import { MetricasContent } from '@/components/admin/metricas-content.client'

export default async function MetricasPage() {
  const metricas = await getMetricasDashboard()

  return <MetricasContent metricas={metricas} />
}
