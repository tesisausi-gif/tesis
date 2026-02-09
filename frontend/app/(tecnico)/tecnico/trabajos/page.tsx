import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth.service'
import { getAsignacionesActivas } from '@/features/asignaciones/asignaciones.service'
import { TrabajosContent } from '@/components/tecnico/trabajos-content.client'

export default async function TecnicoTrabajosPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.id_tecnico) {
    redirect('/login')
  }

  const asignaciones = await getAsignacionesActivas()

  return <TrabajosContent asignaciones={asignaciones} />
}
