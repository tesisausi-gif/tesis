import { getPagosForAdmin } from '@/features/pagos/pagos.service'
import { getPendientesPagoTecnico, getPagosTecnicosRealizados } from '@/features/pagos/pagos-tecnicos.service'
import { getPendientesCobroCliente, getCobrosClientesRealizados } from '@/features/pagos/cobros-clientes.service'
import { PagosContent } from '@/components/admin/pagos-content.client'

export default async function PagosPage() {
  const [pagos, pendientesTecnicos, realizadosTecnicos, pendientesCobroCliente, realizadosCobroCliente] = await Promise.all([
    getPagosForAdmin(),
    getPendientesPagoTecnico(),
    getPagosTecnicosRealizados(),
    getPendientesCobroCliente(),
    getCobrosClientesRealizados(),
  ])

  return (
    <PagosContent
      pagos={pagos as any[]}
      pendientesTecnicos={pendientesTecnicos}
      realizadosTecnicos={realizadosTecnicos}
      pendientesCobroCliente={pendientesCobroCliente}
      realizadosCobroCliente={realizadosCobroCliente}
    />
  )
}
