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

  try {
    const [inmueble, incidentes] = await Promise.all([
      getInmuebleById(idInmueble),
      getIncidentesByInmueble(idInmueble),
    ])

    if (!inmueble) {
      return notFound()
    }

    return (
      <InmuebleDetalleContent
        inmueble={inmueble}
        incidentes={incidentes as any}
      />
    )
  } catch (error) {
    console.error('Error loading inmueble detail:', error)
    return notFound()
  }
}
