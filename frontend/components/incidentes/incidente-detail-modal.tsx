'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  MapPin,
  Calendar,
  User,
  Wrench,
  FileText,
  CheckCircle,
  Clock,
  ClipboardList,
  DollarSign,
  Star,
  Building2,
} from 'lucide-react'
import { estadoIncidenteColors, prioridadColors, EstadoIncidente, NivelPrioridad } from '@/types/enums'

interface TimelineEvent {
  id: string
  tipo: 'creacion' | 'asignacion' | 'inspeccion' | 'presupuesto' | 'pago' | 'conformidad' | 'calificacion' | 'estado'
  titulo: string
  descripcion: string
  fecha: string
  icono: React.ReactNode
  color: string
}

interface IncidenteCompleto {
  id_incidente: number
  descripcion_problema: string
  categoria: string | null
  nivel_prioridad: string | null
  estado_actual: string
  fecha_registro: string
  fecha_cierre: string | null
  fue_resuelto: boolean
  inmuebles: {
    calle: string | null
    altura: string | null
    piso: string | null
    dpto: string | null
    barrio: string | null
    localidad: string | null
    provincia: string | null
    tipos_inmuebles: { nombre: string } | null
  } | null
  clientes: {
    nombre: string
    apellido: string
    correo_electronico: string | null
    telefono: string | null
  } | null
}

interface Props {
  incidenteId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  rol?: 'admin' | 'cliente' | 'tecnico'
}

export function IncidenteDetailModal({ incidenteId, open, onOpenChange, rol = 'admin' }: Props) {
  const [loading, setLoading] = useState(true)
  const [incidente, setIncidente] = useState<IncidenteCompleto | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (open && incidenteId) {
      cargarIncidente()
    }
  }, [open, incidenteId])

  const cargarIncidente = async () => {
    if (!incidenteId) return

    setLoading(true)
    try {
      // Cargar incidente con relaciones
      const { data: incidenteData, error: incidenteError } = await supabase
        .from('incidentes')
        .select(`
          *,
          inmuebles (
            calle, altura, piso, dpto, barrio, localidad, provincia,
            tipos_inmuebles (nombre)
          ),
          clientes:id_cliente_reporta (
            nombre, apellido, correo_electronico, telefono
          )
        `)
        .eq('id_incidente', incidenteId)
        .single()

      if (incidenteError) {
        console.error('Error al cargar incidente:', incidenteError)
        return
      }

      setIncidente(incidenteData as unknown as IncidenteCompleto)

      // Construir timeline desde tablas relacionadas
      const timelineEvents: TimelineEvent[] = []

      // Evento de creación
      timelineEvents.push({
        id: 'creacion',
        tipo: 'creacion',
        titulo: 'Incidente Reportado',
        descripcion: `El cliente reportó el incidente`,
        fecha: incidenteData.fecha_registro,
        icono: <AlertCircle className="h-4 w-4" />,
        color: 'bg-blue-500',
      })

      // Cargar asignaciones
      const { data: asignaciones } = await supabase
        .from('asignaciones_tecnico')
        .select('*, tecnicos(nombre, apellido)')
        .eq('id_incidente', incidenteId)
        .order('fecha_asignacion', { ascending: true })

      asignaciones?.forEach((asig: any) => {
        timelineEvents.push({
          id: `asig-${asig.id_asignacion}`,
          tipo: 'asignacion',
          titulo: `Técnico Asignado`,
          descripcion: `${asig.tecnicos?.nombre} ${asig.tecnicos?.apellido} - Estado: ${asig.estado_asignacion}`,
          fecha: asig.fecha_asignacion,
          icono: <Wrench className="h-4 w-4" />,
          color: 'bg-purple-500',
        })
      })

      // Cargar inspecciones
      const { data: inspecciones } = await supabase
        .from('inspecciones')
        .select('*, tecnicos(nombre, apellido)')
        .eq('id_incidente', incidenteId)
        .order('fecha_inspeccion', { ascending: true })

      inspecciones?.forEach((insp: any) => {
        timelineEvents.push({
          id: `insp-${insp.id_inspeccion}`,
          tipo: 'inspeccion',
          titulo: 'Inspección Realizada',
          descripcion: insp.descripcion_inspeccion,
          fecha: insp.fecha_inspeccion,
          icono: <ClipboardList className="h-4 w-4" />,
          color: 'bg-orange-500',
        })
      })

      // Cargar presupuestos
      const { data: presupuestos } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('id_incidente', incidenteId)
        .order('fecha_creacion', { ascending: true })

      presupuestos?.forEach((pres: any) => {
        timelineEvents.push({
          id: `pres-${pres.id_presupuesto}`,
          tipo: 'presupuesto',
          titulo: `Presupuesto ${pres.estado_presupuesto}`,
          descripcion: `Total: $${pres.costo_total?.toLocaleString()}`,
          fecha: pres.fecha_creacion,
          icono: <FileText className="h-4 w-4" />,
          color: 'bg-cyan-500',
        })
      })

      // Cargar pagos
      const { data: pagos } = await supabase
        .from('pagos')
        .select('*')
        .eq('id_incidente', incidenteId)
        .order('fecha_pago', { ascending: true })

      pagos?.forEach((pago: any) => {
        timelineEvents.push({
          id: `pago-${pago.id_pago}`,
          tipo: 'pago',
          titulo: `Pago Registrado`,
          descripcion: `$${pago.monto_pagado?.toLocaleString()} - ${pago.metodo_pago}`,
          fecha: pago.fecha_pago,
          icono: <DollarSign className="h-4 w-4" />,
          color: 'bg-green-500',
        })
      })

      // Cargar calificaciones
      const { data: calificaciones } = await supabase
        .from('calificaciones')
        .select('*')
        .eq('id_incidente', incidenteId)
        .order('fecha_calificacion', { ascending: true })

      calificaciones?.forEach((cal: any) => {
        timelineEvents.push({
          id: `cal-${cal.id_calificacion}`,
          tipo: 'calificacion',
          titulo: 'Calificación Recibida',
          descripcion: `${cal.puntuacion}/5 - ${cal.comentarios || 'Sin comentarios'}`,
          fecha: cal.fecha_calificacion,
          icono: <Star className="h-4 w-4" />,
          color: 'bg-yellow-500',
        })
      })

      // Evento de cierre si existe
      if (incidenteData.fecha_cierre) {
        timelineEvents.push({
          id: 'cierre',
          tipo: 'estado',
          titulo: 'Incidente Cerrado',
          descripcion: incidenteData.fue_resuelto ? 'Resuelto satisfactoriamente' : 'Cerrado sin resolución',
          fecha: incidenteData.fecha_cierre,
          icono: <CheckCircle className="h-4 w-4" />,
          color: incidenteData.fue_resuelto ? 'bg-green-500' : 'bg-gray-500',
        })
      }

      // Ordenar timeline por fecha
      timelineEvents.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

      setTimeline(timelineEvents)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDireccion = () => {
    if (!incidente?.inmuebles) return 'Sin dirección'
    const i = incidente.inmuebles
    const partes = [i.calle, i.altura, i.piso && `Piso ${i.piso}`, i.dpto && `Dpto ${i.dpto}`]
      .filter(Boolean)
      .join(' ')
    const ubicacion = [i.barrio, i.localidad, i.provincia].filter(Boolean).join(', ')
    return ubicacion ? `${partes}, ${ubicacion}` : partes
  }

  const getEstadoColor = (estado: string) => {
    return estadoIncidenteColors[estado as EstadoIncidente] || 'bg-gray-100 text-gray-800'
  }

  const getPrioridadColor = (prioridad: string) => {
    return prioridadColors[prioridad as NivelPrioridad] || 'bg-gray-100 text-gray-800'
  }

  if (!incidenteId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Incidente #{incidenteId}
          </DialogTitle>
          <DialogDescription>
            Detalles completos y seguimiento del incidente
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : incidente ? (
          <div className="space-y-6">
            {/* Estado y Prioridad */}
            <div className="flex flex-wrap gap-2">
              <Badge className={getEstadoColor(incidente.estado_actual)}>
                {incidente.estado_actual}
              </Badge>
              {incidente.nivel_prioridad && (
                <Badge className={getPrioridadColor(incidente.nivel_prioridad)}>
                  Prioridad: {incidente.nivel_prioridad}
                </Badge>
              )}
              {incidente.categoria && (
                <Badge variant="outline">{incidente.categoria}</Badge>
              )}
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-500">Descripción del Problema</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                {incidente.descripcion_problema}
              </p>
            </div>

            <Separator />

            {/* Información del Inmueble */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Inmueble
              </h4>
              <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                <p className="text-sm font-medium">
                  {incidente.inmuebles?.tipos_inmuebles?.nombre || 'Inmueble'}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {formatDireccion()}
                </p>
              </div>
            </div>

            {/* Información del Cliente (solo para admin) */}
            {rol === 'admin' && incidente.clientes && (
              <>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                    <p className="text-sm font-medium">
                      {incidente.clientes.nombre} {incidente.clientes.apellido}
                    </p>
                    {incidente.clientes.correo_electronico && (
                      <p className="text-sm text-gray-600">{incidente.clientes.correo_electronico}</p>
                    )}
                    {incidente.clientes.telefono && (
                      <p className="text-sm text-gray-600">{incidente.clientes.telefono}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Reporte
                </h4>
                <p className="text-sm">
                  {format(new Date(incidente.fecha_registro), "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
              {incidente.fecha_cierre && (
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Fecha de Cierre
                  </h4>
                  <p className="text-sm">
                    {format(new Date(incidente.fecha_cierre), "dd 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Timeline */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Línea de Tiempo
              </h4>

              {timeline.length > 0 ? (
                <div className="relative">
                  {/* Línea vertical */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

                  <div className="space-y-4">
                    {timeline.map((event, index) => (
                      <div key={event.id} className="relative flex gap-3">
                        {/* Punto en la línea */}
                        <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full ${event.color} text-white`}>
                          {event.icono}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 pb-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{event.titulo}</p>
                            <span className="text-xs text-gray-500">
                              {format(new Date(event.fecha), "dd/MM/yy HH:mm", { locale: es })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{event.descripcion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay eventos registrados aún
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            No se pudo cargar el incidente
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
