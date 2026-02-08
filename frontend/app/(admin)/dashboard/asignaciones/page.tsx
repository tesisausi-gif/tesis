 'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import { ClipboardList, User, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface Asignacion {
  id_asignacion: number
  id_incidente: number
  estado_asignacion: string
  fecha_asignacion: string
  tecnicos: { nombre: string; apellido: string } | null
  incidentes: {
    id_incidente: number
    descripcion_problema: string
    categoria: string | null
    estado_actual: string
    inmuebles: { calle: string | null; altura: string | null } | null
  } | null
}

const estadoAsignacionColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aceptada: 'bg-blue-100 text-blue-800',
  rechazada: 'bg-red-100 text-red-800',
  en_curso: 'bg-orange-100 text-orange-800',
  completada: 'bg-green-100 text-green-800',
}

export default function AdminAsignacionesPage() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [loading, setLoading] = useState(true)
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    cargarAsignaciones()
  }, [])

  const cargarAsignaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('asignaciones_tecnico')
        .select(`
          id_asignacion,
          id_incidente,
          estado_asignacion,
          fecha_asignacion,
          tecnicos (nombre, apellido),
          incidentes (
            id_incidente,
            descripcion_problema,
            categoria,
            estado_actual,
            inmuebles (calle, altura)
          )
        `)
        .order('fecha_asignacion', { ascending: false })

      if (error) {
        console.error('Error cargando asignaciones:', error)
        toast.error('Error al cargar asignaciones')
        return
      }

      setAsignaciones((data as unknown as Asignacion[]) || [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar asignaciones')
    } finally {
      setLoading(false)
    }
  }

  const abrirModal = (id: number) => {
    setIncidenteSeleccionado(id)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Stats
  const total = asignaciones.length
  const pendientes = asignaciones.filter(a => a.estado_asignacion === 'pendiente').length
  const aceptadas = asignaciones.filter(a => a.estado_asignacion === 'aceptada').length
  const rechazadas = asignaciones.filter(a => a.estado_asignacion === 'rechazada').length

  return (
    <div className="space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">Asignaciones</h1>
        <p className="text-sm text-gray-600">Estado de todas las asignaciones realizadas por la administración</p>
      </div>

      <div className="grid gap-3 grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-xl font-bold">{total}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-xl font-bold">{pendientes}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Aceptadas</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-xl font-bold">{aceptadas}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Rechazadas</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-xl font-bold">{rechazadas}</CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {asignaciones.length === 0 ? (
          <p className="text-muted-foreground">No hay asignaciones.</p>
        ) : (
          asignaciones.map((a) => {
            const inc = a.incidentes
            const inm = inc?.inmuebles
            const direccion = inm ? [inm.calle, inm.altura].filter(Boolean).join(' ') : 'Sin dirección'
            return (
              <Card key={a.id_asignacion} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => abrirModal(a.id_incidente)}>
                <CardHeader className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">Incidente #{a.id_incidente}</div>
                      <div className="text-xs text-muted-foreground">{inc?.descripcion_problema || 'Sin descripción'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-xs text-muted-foreground text-right">
                      <div>{a.tecnicos ? `${a.tecnicos.nombre} ${a.tecnicos.apellido}` : 'Técnico no asignado'}</div>
                      <div className="text-[11px]">{direccion}</div>
                    </div>
                    <Badge className={estadoAsignacionColors[a.estado_asignacion] || 'bg-gray-100 text-gray-800'}>{a.estado_asignacion}</Badge>
                  </div>
                </CardHeader>
              </Card>
            )
          })
        )}
      </div>

      {incidenteSeleccionado && (
        <IncidenteDetailModal incidenteId={incidenteSeleccionado} open={modalOpen} onOpenChange={(v) => setModalOpen(v)} rol="admin" />
      )}
    </div>
  )
}
