import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/auth.service'
import { getAsignacionesActivas } from '@/features/asignaciones/asignaciones.service'
import { getPresupuestosDeTecnico } from '@/features/presupuestos/presupuestos.service'
import { getConformidadesPorIncidentes } from '@/features/conformidades/conformidades.service'
import { getMisIncidentesPagados } from '@/features/pagos/pagos-tecnicos.service'
import { getInspeccionesDeTecnico } from '@/features/inspecciones/inspecciones.service'
import { getVisitasActivasPorIncidentes } from '@/features/visitas/visitas.service'
import { getFranjasParaIncidentes } from '@/features/disponibilidad/disponibilidad.service'
import { conformidadVigente } from '@/shared/utils/conformidades'
import { TrabajosContent } from '@/components/tecnico/trabajos-content.client'

export default async function TecnicoTrabajosPage() {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (!user.id_tecnico) redirect('/login')

  const [asignaciones, presupuestos, incidentesPagadosIds, inspecciones] = await Promise.all([
    getAsignacionesActivas(),
    getPresupuestosDeTecnico(),
    getMisIncidentesPagados(),
    getInspeccionesDeTecnico(),
  ])

  const tieneInspeccionPorIncidente: Record<number, boolean> = {}
  for (const insp of inspecciones) {
    if (insp.id_incidente) tieneInspeccionPorIncidente[insp.id_incidente] = true
  }

  const estadoPresupuestoPorIncidente: Record<number, string> = {}
  for (const p of presupuestos) {
    if (p.id_incidente) {
      estadoPresupuestoPorIncidente[p.id_incidente] = p.estado_presupuesto ?? ''
    }
  }

  const idIncidentes = asignaciones.map(a => a.id_incidente).filter(Boolean) as number[]
  const [conformidades, visitasActivas, franjasPorIncidente] = await Promise.all([
    getConformidadesPorIncidentes(idIncidentes),
    getVisitasActivasPorIncidentes(idIncidentes),
    getFranjasParaIncidentes(idIncidentes),
  ])

  // Puede haber varias filas por incidente (rechazadas históricas + resubida):
  // agrupar y quedarse con la VIGENTE de cada incidente.
  const conformidadesAgrupadas: Record<number, typeof conformidades> = {}
  for (const c of conformidades) {
    ;(conformidadesAgrupadas[c.id_incidente] ??= []).push(c)
  }
  const conformidadesPorIncidente: Record<number, { id_conformidad: number; id_incidente: number; esta_firmada: number | boolean; esta_rechazada?: boolean | null; url_documento: string | null }> = {}
  for (const [idInc, lista] of Object.entries(conformidadesAgrupadas)) {
    const vigente = conformidadVigente(lista)
    if (vigente) conformidadesPorIncidente[Number(idInc)] = vigente
  }

  const asignacionesConVisitas = asignaciones.map(a => ({
    ...a,
    visita_activa:        a.id_incidente ? (visitasActivas[a.id_incidente] ?? null) : null,
    tiene_disponibilidad: a.id_incidente ? (franjasPorIncidente[a.id_incidente]?.length ?? 0) > 0 : false,
  }))

  return (
    <TrabajosContent
      asignaciones={asignacionesConVisitas}
      estadoPresupuestoPorIncidente={estadoPresupuestoPorIncidente}
      conformidadesPorIncidente={conformidadesPorIncidente}
      idTecnico={user.id_tecnico!}
      incidentesPagadosIds={incidentesPagadosIds}
      tieneInspeccionPorIncidente={tieneInspeccionPorIncidente}
    />
  )
}
