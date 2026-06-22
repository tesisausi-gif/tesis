import { getMisCobrosComoCliente } from '@/features/pagos/cobros-clientes.service'
import { MisPagosContent } from '@/components/cliente/mis-pagos-content.client'

export default async function PagosClientePage() {
  const { pendientes, realizados } = await getMisCobrosComoCliente().catch(() => ({ pendientes: [], realizados: [] }))

  return <MisPagosContent pendientes={pendientes} realizados={realizados} />
}
