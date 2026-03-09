import { getPagosForAdmin } from '@/features/pagos/pagos.service'
import { getPendientesPagoTecnico, getPagosTecnicosRealizados } from '@/features/pagos/pagos-tecnicos.service'
import { PagosContent } from '@/components/admin/pagos-content.client'

export default async function PagosPage() {
  const [pagos, pendientesTecnicos, realizadosTecnicos] = await Promise.all([
    getPagosForAdmin(),
    getPendientesPagoTecnico(),
    getPagosTecnicosRealizados(),
  ])

  return (
    <PagosContent
      pagos={pagos as any[]}
      pendientesTecnicos={pendientesTecnicos}
      realizadosTecnicos={realizadosTecnicos}
    />
  )
}
