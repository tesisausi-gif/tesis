'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, MapPin, Home, ArrowLeft, AlertCircle, Calendar, User, Wrench } from 'lucide-react'
import { toast } from 'sonner'

interface Inmueble {
  id_inmueble: number
  id_tipo_inmueble: number
  provincia: string | null
  localidad: string | null
  barrio: string | null
  calle: string | null
  altura: string | null
  piso: string | null
  dpto: string | null
  informacion_adicional: string | null
  esta_activo: boolean
  id_cliente: number
  tipos_inmuebles?: {
    nombre: string
  }
  clientes?: {
    nombre: string
    apellido: string
    correo_electronico: string
  }
}

interface Incidente {
  id_incidente: number
  descripcion_problema: string
  estado_actual: string
  nivel_prioridad: string | null
  categoria: string | null
  fecha_registro: string
  fecha_cierre: string | null
  fue_resuelto: boolean | number
  asignaciones_tecnico?: Array<{
    estado_asignacion: string
    tecnicos: {
      nombre: string
      apellido: string
    } | null
  }>
}

export default function InmuebleDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [inmueble, setInmueble] = useState<Inmueble | null>(null)
  const [incidentes, setIncidentes] = useState<Incidente[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (id) {
      cargarDatos()
    }
  }, [id])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Cargar datos del inmueble
      const { data: inmuebleData, error: inmuebleError } = await supabase
        .from('inmuebles')
        .select(`
          *,
          tipos_inmuebles(nombre),
          clientes(nombre, apellido, correo_electronico)
        `)
        .eq('id_inmueble', id)
        .single()

      if (inmuebleError) {
        console.error('Error al cargar inmueble:', inmuebleError)
        toast.error('Error al cargar el inmueble')
        return
      }

      setInmueble(inmuebleData)

      // Cargar incidentes relacionados al inmueble
      const { data: incidentesData, error: incidentesError } = await supabase
        .from('incidentes')
        .select(`
          id_incidente,
          descripcion_problema,
          estado_actual,
          nivel_prioridad,
          categoria,
          fecha_registro,
          fecha_cierre,
          fue_resuelto,
          asignaciones_tecnico(
            estado_asignacion,
            tecnicos(nombre, apellido)
          )
        `)
        .eq('id_propiedad', id)
        .order('fecha_registro', { ascending: false })

      if (incidentesError) {
        console.error('Error al cargar incidentes:', incidentesError)
        toast.error('Error al cargar los incidentes')
        return
      }

      setIncidentes((incidentesData ?? []) as unknown as Incidente[])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const getDireccionCompleta = (inmueble: Inmueble) => {
    const partes = [
      inmueble.calle,
      inmueble.altura,
      inmueble.piso ? `Piso ${inmueble.piso}` : null,
      inmueble.dpto ? `Dpto ${inmueble.dpto}` : null,
    ].filter(Boolean)

    return partes.join(' ')
  }

  const getEstadoColor = (estado?: string | null) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'en_proceso':
        return 'bg-blue-100 text-blue-800'
      case 'resuelto':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoLabel = (estado?: string | null) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente'
      case 'en_proceso': return 'En Proceso'
      case 'resuelto': return 'Resuelto'
      default: return estado || 'Sin estado'
    }
  }

  const getPrioridadColor = (prioridad?: string | null) => {
    switch (prioridad) {
      case 'Urgente':
        return 'bg-red-100 text-red-800'
      case 'Alta':
        return 'bg-orange-100 text-orange-800'
      case 'Media':
        return 'bg-yellow-100 text-yellow-800'
      case 'Baja':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600">Cargando información del inmueble...</p>
        </div>
      </div>
    )
  }

  if (!inmueble) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-600">No se encontró el inmueble</p>
              <div className="flex justify-center mt-4">
                <Button onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalle del Inmueble</h1>
            <p className="text-gray-600">Información completa y incidentes asociados</p>
          </div>
        </div>

        {/* Información del Inmueble */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>{inmueble.tipos_inmuebles?.nombre || 'Inmueble'}</CardTitle>
                  <CardDescription>{getDireccionCompleta(inmueble)}</CardDescription>
                </div>
              </div>
              <Badge variant={inmueble.esta_activo ? 'default' : 'secondary'} className={inmueble.esta_activo ? 'bg-green-500' : 'bg-gray-500'}>
                {inmueble.esta_activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ubicación */}
            <div>
              <h3 className="font-semibold text-sm text-gray-600 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ubicación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                <div>
                  <p className="text-sm text-gray-600">Provincia</p>
                  <p className="font-medium">{inmueble.provincia || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Localidad</p>
                  <p className="font-medium">{inmueble.localidad || '-'}</p>
                </div>
                {inmueble.barrio && (
                  <div>
                    <p className="text-sm text-gray-600">Barrio</p>
                    <p className="font-medium">{inmueble.barrio}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dirección */}
            <div>
              <h3 className="font-semibold text-sm text-gray-600 mb-2 flex items-center gap-2">
                <Home className="h-4 w-4" />
                Dirección
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-6">
                <div>
                  <p className="text-sm text-gray-600">Calle</p>
                  <p className="font-medium">{inmueble.calle || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Altura</p>
                  <p className="font-medium">{inmueble.altura || '-'}</p>
                </div>
                {inmueble.piso && (
                  <div>
                    <p className="text-sm text-gray-600">Piso</p>
                    <p className="font-medium">{inmueble.piso}</p>
                  </div>
                )}
                {inmueble.dpto && (
                  <div>
                    <p className="text-sm text-gray-600">Departamento</p>
                    <p className="font-medium">{inmueble.dpto}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Propietario */}
            {inmueble.clientes && (
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Propietario
                </h3>
                <div className="ml-6">
                  <p className="font-medium">{inmueble.clientes.nombre} {inmueble.clientes.apellido}</p>
                  <p className="text-sm text-gray-600">{inmueble.clientes.correo_electronico}</p>
                </div>
              </div>
            )}

            {/* Información Adicional */}
            {inmueble.informacion_adicional && (
              <div>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">Información Adicional</h3>
                <p className="text-sm ml-6">{inmueble.informacion_adicional}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incidentes Relacionados */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Incidentes Relacionados</CardTitle>
                <CardDescription>
                  {incidentes.length} {incidentes.length === 1 ? 'incidente registrado' : 'incidentes registrados'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {incidentes.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No hay incidentes registrados para este inmueble</p>
            ) : (
              <div className="space-y-3">
                {incidentes.map((incidente) => {
                  const tecnicoAsignado = incidente.asignaciones_tecnico?.find(
                    (a) => a.estado_asignacion === 'aceptada' || a.estado_asignacion === 'en_curso' || a.estado_asignacion === 'completada'
                  )?.tecnicos
                  return (
                    <div
                      key={incidente.id_incidente}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm">
                          #{incidente.id_incidente} — {incidente.categoria || 'Sin categoría'}
                        </h4>
                        <div className="flex gap-2 flex-shrink-0 ml-2">
                          <Badge className={getEstadoColor(incidente.estado_actual)}>
                            {getEstadoLabel(incidente.estado_actual)}
                          </Badge>
                          {incidente.nivel_prioridad && (
                            <Badge className={getPrioridadColor(incidente.nivel_prioridad)}>
                              {incidente.nivel_prioridad}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{incidente.descripcion_problema}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(incidente.fecha_registro).toLocaleDateString('es-AR')}
                        </div>
                        {tecnicoAsignado && (
                          <div className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {tecnicoAsignado.nombre} {tecnicoAsignado.apellido}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
