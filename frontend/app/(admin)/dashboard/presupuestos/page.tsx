import { getPresupuestosForAdmin } from '@/features/presupuestos/presupuestos.service'
import { PresupuestosAdminContent } from '@/components/admin/presupuestos-admin-content.client'

export default async function PresupuestosPage() {
  const presupuestos = await getPresupuestosForAdmin()
  return <PresupuestosAdminContent presupuestos={presupuestos} />
}
