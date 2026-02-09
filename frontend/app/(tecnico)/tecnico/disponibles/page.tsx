import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth.service'
import { getAsignacionesPendientes } from '@/features/asignaciones/asignaciones.service'
import { DisponiblesContent } from '@/components/tecnico/disponibles-content.client'

export default async function TecnicoDisponiblesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.id_tecnico) {
    redirect('/login')
  }

  const asignaciones = await getAsignacionesPendientes()

  return <DisponiblesContent asignaciones={asignaciones} />
}
