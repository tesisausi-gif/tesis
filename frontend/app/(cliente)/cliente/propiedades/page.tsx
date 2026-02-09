import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth.service'
import { getInmueblesByCurrentUser, getTiposInmuebles } from '@/features/inmuebles/inmuebles.service'
import { PropiedadesContent } from '@/components/cliente/propiedades-content.client'

export default async function ClientePropiedadesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.id_cliente) {
    redirect('/login')
  }

  const [inmuebles, tiposInmuebles] = await Promise.all([
    getInmueblesByCurrentUser(),
    getTiposInmuebles(),
  ])

  return <PropiedadesContent inmuebles={inmuebles} tiposInmuebles={tiposInmuebles} idCliente={user.id_cliente} />
}
