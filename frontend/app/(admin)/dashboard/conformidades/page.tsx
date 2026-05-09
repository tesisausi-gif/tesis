import { getConformidadesPendientes, getConformidadesHistorial } from '@/features/conformidades/conformidades.service'
import { ConformidadesContent } from '@/components/admin/conformidades-content.client'

export default async function ConformidadesPage() {
  const [conformidades, historial] = await Promise.all([
    getConformidadesPendientes(),
    getConformidadesHistorial(),
  ])
  return <ConformidadesContent conformidades={conformidades as any[]} historial={historial as any[]} />
}
