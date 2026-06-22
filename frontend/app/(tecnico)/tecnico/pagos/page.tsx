import { getMisPagosComoTecnico } from '@/features/pagos/pagos-tecnicos.service'
import { MisPagosTecnicoContent } from '@/components/tecnico/mis-pagos-tecnico-content.client'

export default async function PagosTecnicoPage() {
  const { pendientes, recibidos } = await getMisPagosComoTecnico().catch(() => ({ pendientes: [], recibidos: [] }))

  return <MisPagosTecnicoContent pendientes={pendientes} recibidos={recibidos} />
}
