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
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
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
  UserPlus,
  Settings,
  Save,
} from 'lucide-react'
import { NivelPrioridad } from '@/types/enums'

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
  disponibilidad: string | null
  categoria: string | null
  nivel_prioridad: string | null
  estado_actual: string
  fecha_registro: string
  fecha_cierre: string | null
  fue_resuelto: boolean | number
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

interface Tecnico {
  id_tecnico: number
  nombre: string
  apellido: string
  especialidad: string | null
  esta_activo: boolean | number
}

interface Asignacion {
  id_asignacion: number
  id_tecnico: number
  estado_asignacion: string
  fecha_asignacion: string
  observaciones: string | null
  tecnicos: {
    nombre: string
    apellido: string
    especialidad: string | null
  } | null
}

interface Props {
  incidenteId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
  rol?: 'admin' | 'cliente' | 'tecnico'
}

// Estados simplificados
const ESTADOS_INCIDENTE = [
  'pendiente',
  'en_proceso',
  'resuelto',
]

const ESTADOS_LABELS: Record<string, string> = {
  'pendiente': 'Pendiente',
  'en_proceso': 'En Proceso',
  'resuelto': 'Resuelto',
}

const ESTADO_COLORS: Record<string, string> = {
  'pendiente': 'bg-yellow-100 text-yellow-800',
  'en_proceso': 'bg-blue-100 text-blue-800',
  'resuelto': 'bg-green-100 text-green-800',
}

const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente']

const ESTADO_ASIGNACION_LABELS: Record<string, string> = {
  'pendiente': 'Pendiente',
  'aceptada': 'Aceptada',
  'rechazada': 'Rechazada',
  'en_curso': 'En Curso',
  'completada': 'Completada',
}

const PRIORIDAD_COLORS: Record<string, string> = {
  'Baja': 'bg-green-100 text-green-800',
  'Media': 'bg-yellow-100 text-yellow-800',
  'Alta': 'bg-orange-100 text-orange-800',
  'Urgente': 'bg-red-100 text-red-800',
}

export function IncidenteDetailModal({ incidenteId, open, onOpenChange, onUpdate, rol = 'admin' }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [incidente, setIncidente] = useState<IncidenteCompleto | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])

  // Form state para gestión
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [nuevaPrioridad, setNuevaPrioridad] = useState('')
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState('')
  const [observacionesAsignacion, setObservacionesAsignacion] = useState('')

  const supabase = createClient()

  useEffect(() => {
    if (open && incidenteId) {
      cargarIncidente()
      if (rol === 'admin') {
        cargarTecnicos()
      }
    }
  }, [open, incidenteId])

  const cargarTecnicos = async () => {
    const { data, error } = await supabase
      .from('tecnicos')
      .select('id_tecnico, nombre, apellido, especialidad, esta_activo')
      .eq('esta_activo', 1)
      .order('nombre')

    if (!error && data) {
      setTecnicos(data)
    }
  }

  const cargarIncidente = async () => {
    if (!incidenteId) return

    setLoading(true)
    try {
      // Cargar incidente con relaciones
      const { data: incidenteData, error: incidenteError } = await supabase
        .from('incidentes')
        .select(`
          *,
          inmuebles:id_propiedad (
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
      setNuevoEstado(incidenteData.estado_actual || '')
      setNuevaPrioridad(incidenteData.nivel_prioridad || '')

      // Cargar asignaciones
      const { data: asignacionesData } = await supabase
        .from('asignaciones_tecnico')
        .select('*, tecnicos(nombre, apellido, especialidad)')
        .eq('id_incidente', incidenteId)
        .order('fecha_asignacion', { ascending: false })

      setAsignaciones((asignacionesData as unknown as Asignacion[]) || [])

      // Construir timeline
      await construirTimeline(incidenteData, asignacionesData || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const construirTimeline = async (incidenteData: any, asignacionesData: any[]) => {
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

    // Asignaciones
    asignacionesData?.forEach((asig: any) => {
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
        descripcion: insp.descripcion_inspeccion || 'Sin descripción',
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
        titulo: `Presupuesto ${pres.estado_presupuesto || ''}`,
        descripcion: `Total: $${pres.costo_total?.toLocaleString() || 0}`,
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
        descripcion: `$${pago.monto_pagado?.toLocaleString() || 0} - ${pago.metodo_pago || ''}`,
        fecha: pago.fecha_pago,
        icono: <DollarSign className="h-4 w-4" />,
        color: 'bg-green-500',
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
  }

  const guardarCambios = async () => {
    if (!incidenteId) return

    setSaving(true)
    try {
      const updates: any = {}

      if (nuevoEstado && nuevoEstado !== incidente?.estado_actual) {
        updates.estado_actual = nuevoEstado
      }

      if (nuevaPrioridad && nuevaPrioridad !== incidente?.nivel_prioridad) {
        updates.nivel_prioridad = nuevaPrioridad
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('incidentes')
          .update(updates)
          .eq('id_incidente', incidenteId)

        if (error) {
          toast.error('Error al actualizar incidente', { description: error.message })
          return
        }

        toast.success('Incidente actualizado')
        await cargarIncidente()
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  const asignarTecnico = async () => {
    if (!incidenteId || !tecnicoSeleccionado) {
      toast.error('Selecciona un técnico')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('asignaciones_tecnico')
        .insert({
          id_incidente: incidenteId,
          id_tecnico: parseInt(tecnicoSeleccionado),
          estado_asignacion: 'pendiente',
          observaciones: observacionesAsignacion || null,
        })

      if (error) {
        toast.error('Error al asignar técnico', { description: error.message })
        return
      }

      // Actualizar estado del incidente a "en_proceso" si está en "pendiente"
      if (incidente?.estado_actual === 'pendiente') {
        await supabase
          .from('incidentes')
          .update({ estado_actual: 'en_proceso' })
          .eq('id_incidente', incidenteId)
      }

      toast.success('Técnico asignado exitosamente')
      setTecnicoSeleccionado('')
      setObservacionesAsignacion('')
      await cargarIncidente()
      onUpdate?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
    } finally {
      setSaving(false)
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
    return ESTADO_COLORS[estado] || 'bg-gray-100 text-gray-800'
  }

  const getPrioridadColor = (prioridad: string) => {
    return PRIORIDAD_COLORS[prioridad] || 'bg-gray-100 text-gray-800'
  }

  const getEstadoLabel = (estado: string) => {
    return ESTADOS_LABELS[estado] || estado
  }

  if (!incidenteId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Incidente #{incidenteId}
          </DialogTitle>
          <DialogDescription>
            {rol === 'admin' ? 'Gestión completa del incidente' : 'Detalles del incidente'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : incidente ? (
          <Tabs defaultValue="detalles" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="detalles">Detalles</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              {rol === 'admin' && <TabsTrigger value="gestion">Gestión</TabsTrigger>}
            </TabsList>

            {/* Tab Detalles */}
            <TabsContent value="detalles" className="space-y-4 mt-4">
              {/* Estado y Prioridad */}
              <div className="flex flex-wrap gap-2">
                <Badge className={getEstadoColor(incidente.estado_actual)}>
                  {getEstadoLabel(incidente.estado_actual)}
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

              {/* Disponibilidad */}
              {incidente.disponibilidad && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Disponibilidad para Contacto/Visita
                  </h4>
                  <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-100 italic">
                    {incidente.disponibilidad}
                  </p>
                </div>
              )}

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

              {/* Información del Cliente */}
              {(rol === 'admin' || rol === 'tecnico') && incidente.clientes && (
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
              )}

              {/* Técnicos Asignados */}
              {asignaciones.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Técnicos Asignados
                  </h4>
                  <div className="space-y-2">
                    {asignaciones.map((asig) => (
                      <div key={asig.id_asignacion} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {asig.tecnicos?.nombre} {asig.tecnicos?.apellido}
                          </p>
                          <p className="text-xs text-gray-500">
                            {asig.tecnicos?.especialidad || 'Sin especialidad'}
                          </p>
                        </div>
                        <Badge variant="outline">{ESTADO_ASIGNACION_LABELS[asig.estado_asignacion] || asig.estado_asignacion}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
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
            </TabsContent>

            {/* Tab Timeline */}
            <TabsContent value="timeline" className="mt-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Línea de Tiempo
                </h4>

                {timeline.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                      {timeline.map((event) => (
                        <div key={event.id} className="relative flex gap-3">
                          <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full ${event.color} text-white`}>
                            {event.icono}
                          </div>
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
            </TabsContent>

            {/* Tab Gestión (solo admin) */}
            {rol === 'admin' && (
              <TabsContent value="gestion" className="space-y-6 mt-4">
                {/* Cambiar Estado y Prioridad */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Estado y Prioridad
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS_INCIDENTE.map((estado) => (
                            <SelectItem key={estado} value={estado}>
                              {ESTADOS_LABELS[estado] || estado}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Prioridad</Label>
                      <Select value={nuevaPrioridad} onValueChange={setNuevaPrioridad}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar prioridad" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORIDADES.map((prio) => (
                            <SelectItem key={prio} value={prio}>
                              {prio}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={guardarCambios}
                    disabled={saving}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>

                <Separator />

                {/* Asignar Técnico */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Asignar Técnico
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Técnico</Label>
                      <Select value={tecnicoSeleccionado} onValueChange={setTecnicoSeleccionado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar técnico" />
                        </SelectTrigger>
                        <SelectContent>
                          {tecnicos.map((tecnico) => (
                            <SelectItem key={tecnico.id_tecnico} value={tecnico.id_tecnico.toString()}>
                              {tecnico.nombre} {tecnico.apellido} {tecnico.especialidad && `(${tecnico.especialidad})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Observaciones (opcional)</Label>
                      <Textarea
                        value={observacionesAsignacion}
                        onChange={(e) => setObservacionesAsignacion(e.target.value)}
                        placeholder="Instrucciones o notas para el técnico..."
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={asignarTecnico}
                      disabled={saving || !tecnicoSeleccionado}
                      variant="outline"
                      className="w-full"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {saving ? 'Asignando...' : 'Asignar Técnico'}
                    </Button>
                  </div>
                </div>

                {/* Asignaciones actuales */}
                {asignaciones.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-gray-500">Asignaciones Actuales</h4>
                      {asignaciones.map((asig) => (
                        <div key={asig.id_asignacion} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                {asig.tecnicos?.nombre} {asig.tecnicos?.apellido}
                              </p>
                              <p className="text-xs text-gray-500">
                                Asignado: {format(new Date(asig.fecha_asignacion), "dd/MM/yy HH:mm", { locale: es })}
                              </p>
                            </div>
                            <Badge variant="outline">{ESTADO_ASIGNACION_LABELS[asig.estado_asignacion] || asig.estado_asignacion}</Badge>
                          </div>
                          {asig.observaciones && (
                            <p className="text-xs text-gray-600 mt-2 bg-white p-2 rounded">
                              {asig.observaciones}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <p className="text-center text-gray-500 py-8">
            No se pudo cargar el incidente
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
