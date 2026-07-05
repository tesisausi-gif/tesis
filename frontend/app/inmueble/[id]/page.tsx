import { notFound } from 'next/navigation'
import { getInmuebleById } from '@/features/inmuebles/inmuebles.service'
import { getIncidentesByInmueble } from '@/features/incidentes/incidentes.service'
import { InmuebleDetalleContent } from '@/components/inmuebles/inmueble-detalle-content.client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function InmuebleDetallePage({ params }: Props) {
  const { id } = await params
  const idInmueble = parseInt(id, 10)

  if (isNaN(idInmueble)) {
    return notFound()
  }

  // notFound() LANZA: no debe llamarse dentro de un try que lo capture, ni
  // envolver el JSX (los errores de datos se degradaban a 404 silenciosos).
  let inmueble: Awaited<ReturnType<typeof getInmuebleById>> | null = null
  let incidentes: Awaited<ReturnType<typeof getIncidentesByInmueble>> = []
  try {
    ;[inmueble, incidentes] = await Promise.all([
      getInmuebleById(idInmueble),
      getIncidentesByInmueble(idInmueble),
    ])
  } catch (error) {
    console.error('Error loading inmueble detail:', error)
    throw error
  }

  if (!inmueble) {
    return notFound()
  }

  return (
    <InmuebleDetalleContent
      inmueble={inmueble}
      incidentes={incidentes as any}
    />
  )
}
