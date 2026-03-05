import { getConformidadesPendientes } from '@/features/conformidades/conformidades.service'
import { ConformidadesContent } from '@/components/admin/conformidades-content.client'

export default async function ConformidadesPage() {
  const conformidades = await getConformidadesPendientes()
  return <ConformidadesContent conformidades={conformidades as any[]} />
}
