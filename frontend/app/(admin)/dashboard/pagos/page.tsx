import { Suspense } from 'react'
import { getPendientesPagoTecnico, getPagosTecnicosRealizados } from '@/features/pagos/pagos-tecnicos.service'
import { getPendientesCobroCliente, getCobrosClientesRealizados } from '@/features/pagos/cobros-clientes.service'
import { PagosContent } from '@/components/admin/pagos-content.client'

export default async function PagosPage() {
  const [pendientesTecnicos, realizadosTecnicos, pendientesCobroCliente, realizadosCobroCliente] = await Promise.all([
    getPendientesPagoTecnico(),
    getPagosTecnicosRealizados(),
    getPendientesCobroCliente(),
    getCobrosClientesRealizados(),
  ])

  return (
    <Suspense>
      <PagosContent
        pendientesTecnicos={pendientesTecnicos}
        realizadosTecnicos={realizadosTecnicos}
        pendientesCobroCliente={pendientesCobroCliente}
        realizadosCobroCliente={realizadosCobroCliente}
      />
    </Suspense>
  )
}
