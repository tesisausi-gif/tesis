import { getPresupuestosForAdmin } from '@/features/presupuestos/presupuestos.service'
import { AprobarPresupuestosContent } from '@/components/admin/aprobar-presupuestos-content.client'

export default async function AprobarPresupuestosPage() {
  const presupuestos = await getPresupuestosForAdmin()
  const presupuestosEnviados = presupuestos.filter(p => p.estado_presupuesto === 'enviado')

  return <AprobarPresupuestosContent presupuestosIniciales={presupuestosEnviados} />
}
