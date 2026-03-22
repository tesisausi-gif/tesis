'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Building2,
  UserPlus,
  Settings,
  Save,
  Loader2,
  Send,
  XCircle,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { CategoriaIncidente, EstadoIncidente, EstadoPresupuesto } from '@/shared/types/enums'
import { InspeccionesList } from './inspecciones-list'
import { CalificacionTecnico } from '@/components/cliente/calificacion-tecnico'
import { getInspeccionesDelIncidente } from '@/features/inspecciones/inspecciones.service'
import {
  getIncidenteCompleto,
  getAsignacionesDelIncidente,
  getTimelineData,
  actualizarIncidente,
} from '@/features/incidentes/incidentes.service'
import { crearAsignacion } from '@/features/asignaciones/asignaciones.service'
import { getTecnicosParaAsignacion } from '@/features/usuarios/usuarios.service'
import { getPresupuestosDelIncidente, crearPresupuesto } from '@/features/presupuestos/presupuestos.service'
import { PresupuestosClienteList } from '@/components/cliente/presupuestos-cliente-list'
import type { Presupuesto } from '@/features/presupuestos/presupuestos.types'
import type { Tecnico } from '@/features/usuarios/usuarios.types'

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

function TecnicoAsignadoCard({ nombre, especialidad, telefono, email, estado }: {
  nombre: string
  especialidad?: string
  telefono?: string
  email?: string
  estado: string
}) {
  const [contactoVisible, setContactoVisible] = useState(false)
  const tieneContacto = telefono || email

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
        <Wrench className="h-4 w-4" />
        Técnico Asignado
      </h4>
      <div className="bg-gray-50 p-3 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{nombre}</p>
            {especialidad && <p className="text-xs text-gray-500">{especialidad}</p>}
          </div>
          <Badge variant="outline">{ESTADO_ASIGNACION_LABELS[estado] || estado}</Badge>
        </div>
        {tieneContacto && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 -ml-2"
              onClick={() => setContactoVisible(v => !v)}
            >
              {contactoVisible ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {contactoVisible ? 'Ocultar datos' : 'Ver datos de contacto'}
            </Button>
            {contactoVisible && (
              <div className="mt-1 space-y-1 border-t pt-2">
                {telefono && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-gray-400" />
                    {telefono}
                  </p>
                )}
                {email && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-gray-400" />
                    {email}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const ESTADO_ASIGNACION_LABELS: Record<string, string> = {
  'pendiente': 'Pendiente',
  'aceptada': 'Aceptada',
  'rechazada': 'Rechazada',
  'en_curso': 'En Curso',
  'completada': 'Completada',
}


export function IncidenteDetailModal({ incidenteId, open, onOpenChange, onUpdate, rol = 'admin' }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [incidente, setIncidente] = useState<IncidenteCompleto | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [inspecciones, setInspecciones] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])

  // Form state para gestión
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState('')
  const [observacionesAsignacion, setObservacionesAsignacion] = useState('')

  // Form state para presupuesto
  const [presDescripcion, setPresDescripcion] = useState('')
  const [presCostoMateriales, setPresCostoMateriales] = useState('')
  const [presCostoManoObra, setPresCostoManoObra] = useState('')
  const [presAlternativas, setPresAlternativas] = useState('')
  const [presInspeccionId, setPresInspeccionId] = useState('')
  const [savingPresupuesto, setSavingPresupuesto] = useState(false)

  const CATEGORIAS = Object.values(CategoriaIncidente) as string[]

  useEffect(() => {
    if (open && incidenteId) {
      cargarIncidente()
      if (rol === 'admin') {
        cargarTecnicos()
      }
    }
  }, [open, incidenteId])

  const cargarTecnicos = async () => {
    try {
      const data = await getTecnicosParaAsignacion()
      setTecnicos(data)
    } catch (error) {
      console.error('Error cargando técnicos:', error)
    }
  }

  const cargarIncidente = async () => {
    if (!incidenteId) return

    setLoading(true)
    try {
      // Cargar incidente con relaciones
      const incidenteData = await getIncidenteCompleto(incidenteId)

      setIncidente(incidenteData as unknown as IncidenteCompleto)
      setNuevoEstado(incidenteData.estado_actual || '')
      // Cargar asignaciones
      const asignacionesData = await getAsignacionesDelIncidente(incidenteId)
      setAsignaciones(asignacionesData as unknown as Asignacion[])

      // Cargar datos específicos por rol
      if (rol === 'tecnico') {
        try {
          const [inspeccionesData, presupuestosData] = await Promise.all([
            getInspeccionesDelIncidente(incidenteId),
            getPresupuestosDelIncidente(incidenteId),
          ])
          setInspecciones(inspeccionesData)
          setPresupuestos(presupuestosData)
        } catch (error) {
          console.error('Error al cargar datos del técnico:', error)
        }
      }

      if (rol === 'cliente') {
        try {
          const presupuestosData = await getPresupuestosDelIncidente(incidenteId)
          // El cliente solo ve presupuestos que la inmobiliaria ya aprobó y ajustó.
          // No ve: 'enviado' (precio original del técnico) ni 'rechazado' por admin (decisión interna).
          const visiblesParaCliente = presupuestosData.filter(p =>
            [EstadoPresupuesto.APROBADO_ADMIN, EstadoPresupuesto.APROBADO].includes(p.estado_presupuesto as EstadoPresupuesto)
          )
          setPresupuestos(visiblesParaCliente)
        } catch (error) {
          console.error('Error al cargar presupuestos del cliente:', error)
        }
      }

      // Construir timeline
      await construirTimeline(incidenteData, asignacionesData, rol)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const construirTimeline = async (incidenteData: any, asignacionesData: any[], rolActual: string = 'admin') => {
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
      const tecnicoNombre = `${asig.tecnicos?.nombre || ''} ${asig.tecnicos?.apellido || ''}`.trim()

      let titulo: string
      let color: string

      switch (asig.estado_asignacion) {
        case 'pendiente':
          titulo = 'Solicitud de Asignación'
          color = 'bg-orange-400'
          break
        case 'aceptada':
          titulo = 'Técnico Aceptó la Asignación'
          color = 'bg-purple-500'
          break
        case 'rechazada':
          titulo = 'Técnico Rechazó la Asignación'
          color = 'bg-red-500'
          break
        case 'en_curso':
          titulo = 'Trabajo en Curso'
          color = 'bg-blue-500'
          break
        case 'completada':
          titulo = 'Trabajo Completado'
          color = 'bg-green-500'
          break
        default:
          titulo = 'Asignación de Técnico'
          color = 'bg-purple-500'
      }

      const descripcion = asig.observaciones
        ? `${tecnicoNombre} — ${asig.observaciones}`
        : tecnicoNombre

      timelineEvents.push({
        id: `asig-${asig.id_asignacion}`,
        tipo: 'asignacion',
        titulo,
        descripcion,
        fecha: asig.fecha_asignacion,
        icono: <Wrench className="h-4 w-4" />,
        color,
      })
    })

    // Cargar inspecciones, presupuestos y pagos para timeline
    const { inspecciones, presupuestos, pagos } = await getTimelineData(incidenteData.id_incidente)

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

    presupuestos?.forEach((pres: any) => {
      if (rolActual === 'cliente') {
        // El cliente solo ve el presupuesto que la inmobiliaria le envía (aprobado_admin o aprobado)
        if (!['aprobado_admin', 'aprobado'].includes(pres.estado_presupuesto)) return
        timelineEvents.push({
          id: `pres-${pres.id_presupuesto}`,
          tipo: 'presupuesto',
          titulo: 'Presupuesto Recibido',
          descripcion: `La inmobiliaria te envió un presupuesto por $${(pres.costo_total ?? 0).toLocaleString()}`,
          fecha: pres.fecha_modificacion || pres.fecha_creacion,
          icono: <FileText className="h-4 w-4" />,
          color: 'bg-cyan-500',
        })
        if (pres.estado_presupuesto === 'aprobado' && pres.fecha_aprobacion) {
          timelineEvents.push({
            id: `pres-aprobado-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: 'Presupuesto Aprobado',
            descripcion: `Aprobaste el presupuesto por $${(pres.costo_total ?? 0).toLocaleString()}`,
            fecha: pres.fecha_aprobacion,
            icono: <CheckCircle className="h-4 w-4" />,
            color: 'bg-green-500',
          })
        }
      } else {
        // Admin y técnico ven todo
        timelineEvents.push({
          id: `pres-${pres.id_presupuesto}`,
          tipo: 'presupuesto',
          titulo: 'Presupuesto Enviado',
          descripcion: `Total: $${(pres.costo_total ?? 0).toLocaleString()}`,
          fecha: pres.fecha_creacion,
          icono: <FileText className="h-4 w-4" />,
          color: 'bg-cyan-500',
        })
        if (pres.estado_presupuesto === 'rechazado' && pres.fecha_modificacion) {
          timelineEvents.push({
            id: `pres-rechazado-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: 'Presupuesto Rechazado',
            descripcion: 'El incidente volvió a estado Pendiente',
            fecha: pres.fecha_modificacion,
            icono: <XCircle className="h-4 w-4" />,
            color: 'bg-red-500',
          })
        }
      }
    })

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
      const updates: Record<string, string | null> = {}

      if (nuevoEstado && nuevoEstado !== incidente?.estado_actual) {
        updates.estado_actual = nuevoEstado
      }

      if (nuevaCategoria && nuevaCategoria !== incidente?.categoria) {
        updates.categoria = nuevaCategoria === '__NONE__' ? null : nuevaCategoria
      }

      if (Object.keys(updates).length > 0) {
        const result = await actualizarIncidente(incidenteId, updates)

        if (!result.success) {
          toast.error('Error al actualizar incidente', { description: result.error })
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
      const result = await crearAsignacion({
        id_incidente: incidenteId,
        id_tecnico: parseInt(tecnicoSeleccionado),
        observaciones: observacionesAsignacion || null,
      })

      if (!result.success) {
        toast.error('Error al asignar técnico', { description: result.error })
        return
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

  const handleCrearPresupuesto = async () => {
    if (!incidenteId || !presDescripcion.trim()) {
      toast.error('La descripción es obligatoria')
      return
    }

    const materiales = parseFloat(presCostoMateriales) || 0
    const manoObra = parseFloat(presCostoManoObra) || 0
    const total = materiales + manoObra

    setSavingPresupuesto(true)
    try {
      const result = await crearPresupuesto({
        id_incidente: incidenteId,
        id_inspeccion: inspecciones[0]?.id_inspeccion ?? null,
        descripcion_detallada: presDescripcion.trim(),
        costo_materiales: materiales || undefined,
        costo_mano_obra: manoObra || undefined,
        costo_total: total,
        alternativas_reparacion: presAlternativas.trim() || undefined,
      })

      if (!result.success) {
        toast.error('Error al crear presupuesto', { description: result.error })
        return
      }

      toast.success('Presupuesto enviado correctamente')
      setPresDescripcion('')
      setPresCostoMateriales('')
      setPresCostoManoObra('')
      setPresAlternativas('')
      setPresInspeccionId('')
      // Recargar presupuestos
      const data = await getPresupuestosDelIncidente(incidenteId)
      setPresupuestos(data)
      onUpdate?.()
    } catch {
      toast.error('Error inesperado al crear presupuesto')
    } finally {
      setSavingPresupuesto(false)
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
        ) : incidente ? (() => {
          const hasTecnicoTabs = rol === 'tecnico' && asignaciones.some(a => ['aceptada', 'en_curso', 'completada'].includes(a.estado_asignacion))
          const hasClientePresupuesto = rol === 'cliente' && presupuestos.length > 0
          const hasCalificacion = rol === 'cliente' && incidente.estado_actual === EstadoIncidente.RESUELTO
          const tabCount = 2
            + (hasTecnicoTabs ? 2 : 0)
            + (rol === 'admin' ? 1 : 0)
            + (hasClientePresupuesto ? 1 : 0)
            + (hasCalificacion ? 1 : 0)
          const tabGridClass = tabCount === 3 ? 'grid-cols-3' : tabCount === 4 ? 'grid-cols-4' : 'grid-cols-2'
          return (
          <Tabs defaultValue="detalles" className="w-full">
            <TabsList className={`grid w-full ${tabGridClass}`}>
              <TabsTrigger value="detalles">Detalles</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              {hasTecnicoTabs && <TabsTrigger value="inspecciones">Inspecciones</TabsTrigger>}
              {hasTecnicoTabs && <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>}
              {hasClientePresupuesto && <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>}
              {hasCalificacion && <TabsTrigger value="calificacion">Calificar</TabsTrigger>}
              {rol === 'admin' && <TabsTrigger value="gestion">Gestión</TabsTrigger>}
            </TabsList>

            {/* Tab Detalles */}
            <TabsContent value="detalles" className="space-y-4 mt-4">
              {/* Estado y Categoría */}
              <div className="flex flex-wrap gap-2">
                <Badge className={getEstadoColor(incidente.estado_actual)}>
                  {getEstadoLabel(incidente.estado_actual)}
                </Badge>
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

              {/* Técnico Asignado */}
              {(() => {
                const asigActiva = asignaciones.find(a =>
                  ['pendiente', 'aceptada', 'en_curso', 'completada'].includes(a.estado_asignacion)
                )
                if (!asigActiva) return null
                const tec = asigActiva.tecnicos
                return (
                  <TecnicoAsignadoCard
                    nombre={tec ? `${tec.nombre} ${tec.apellido}` : 'Sin nombre'}
                    especialidad={(tec as any)?.especialidad}
                    telefono={(tec as any)?.telefono}
                    email={(tec as any)?.correo_electronico}
                    estado={asigActiva.estado_asignacion}
                  />
                )
              })()}

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
                {/* Cambiar Estado y Categoría */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Estado
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Label>Categoría</Label>
                      <Select value={nuevaCategoria} onValueChange={setNuevaCategoria}>
                        <SelectTrigger>
                          <SelectValue placeholder="Asignar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__NONE__">Sin categoría</SelectItem>
                          {CATEGORIAS.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
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

            {/* Tab Inspecciones (para técnicos con asignación confirmada) */}
            {rol === 'tecnico' && incidente && asignaciones.some(a => ['aceptada', 'en_curso', 'completada'].includes(a.estado_asignacion)) && (
              <TabsContent value="inspecciones" className="mt-4">
                <InspeccionesList
                  incidenteId={incidente.id_incidente}
                  idTecnico={asignaciones[0]?.id_tecnico || 0}
                  inspecciones={inspecciones}
                  onInspeccionCreated={() => {
                    cargarIncidente()
                  }}
                  onInspeccionDeleted={() => {
                    cargarIncidente()
                  }}
                />
              </TabsContent>
            )}

            {/* Tab Presupuesto (para técnicos con asignación confirmada) */}
            {rol === 'tecnico' && incidente && asignaciones.some(a => ['aceptada', 'en_curso', 'completada'].includes(a.estado_asignacion)) && (
              <TabsContent value="presupuesto" className="mt-4 space-y-4">
                {presupuestos.length > 0 ? (
                  <div className="space-y-4">
                    {presupuestos.map((pres) => {
                      const estado = pres.estado_presupuesto as EstadoPresupuesto
                      const estadoConfig: Record<string, { label: string; className: string }> = {
                        [EstadoPresupuesto.ENVIADO]: { label: 'Enviado — pendiente de revisión', className: 'bg-blue-50 border-blue-200 text-blue-800' },
                        [EstadoPresupuesto.APROBADO_ADMIN]: { label: 'Aprobado por administración — pendiente de aprobación del cliente', className: 'bg-amber-50 border-amber-200 text-amber-800' },
                        [EstadoPresupuesto.APROBADO]: { label: 'Aprobado — autorizado para ejecutar', className: 'bg-green-50 border-green-200 text-green-800' },
                        [EstadoPresupuesto.RECHAZADO]: { label: 'Rechazado', className: 'bg-red-50 border-red-200 text-red-800' },
                        [EstadoPresupuesto.VENCIDO]: { label: 'Vencido', className: 'bg-gray-50 border-gray-200 text-gray-600' },
                      }
                      const cfg = estadoConfig[estado] ?? { label: estado, className: 'bg-gray-50 border-gray-200 text-gray-600' }
                      return (
                        <div key={pres.id_presupuesto} className={`rounded-lg border p-4 space-y-3 ${cfg.className}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide">Presupuesto #{pres.id_presupuesto}</span>
                            <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                          </div>
                          <p className="text-sm">{pres.descripcion_detallada}</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {pres.costo_materiales != null && (
                              <div className="bg-white/70 rounded p-2">
                                <p className="text-xs text-gray-500">Materiales</p>
                                <p className="text-sm font-semibold">${(pres.costo_materiales ?? 0).toLocaleString()}</p>
                              </div>
                            )}
                            {pres.costo_mano_obra != null && (
                              <div className="bg-white/70 rounded p-2">
                                <p className="text-xs text-gray-500">Mano de obra</p>
                                <p className="text-sm font-semibold">${(pres.costo_mano_obra ?? 0).toLocaleString()}</p>
                              </div>
                            )}
                            <div className="bg-white/70 rounded p-2">
                              <p className="text-xs text-gray-500">Total</p>
                              <p className="text-sm font-bold">${(pres.costo_total ?? 0).toLocaleString()}</p>
                            </div>
                          </div>
                          {pres.alternativas_reparacion && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-1">Alternativas</p>
                              <p className="text-xs">{pres.alternativas_reparacion}</p>
                            </div>
                          )}
                          {pres.fecha_creacion && (
                            <p className="text-xs text-gray-500">
                              Creado: {format(new Date(pres.fecha_creacion), "dd/MM/yy HH:mm", { locale: es })}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : inspecciones.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Inspección requerida</p>
                      <p>Debés cargar al menos una inspección antes de poder crear un presupuesto. Andá al tab Inspecciones para registrarla.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Nuevo Presupuesto
                      </h4>
                      <div className="space-y-2">
                        <Label>Descripción detallada <span className="text-red-500">*</span></Label>
                        <Textarea
                          value={presDescripcion}
                          onChange={(e) => setPresDescripcion(e.target.value)}
                          placeholder="Describí el trabajo a realizar, materiales necesarios, etc."
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Costo materiales ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={presCostoMateriales}
                            onChange={(e) => setPresCostoMateriales(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Costo mano de obra ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={presCostoManoObra}
                            onChange={(e) => setPresCostoManoObra(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      {(presCostoMateriales || presCostoManoObra) && (
                        <p className="text-sm text-gray-600 font-medium">
                          Total estimado: ${((parseFloat(presCostoMateriales) || 0) + (parseFloat(presCostoManoObra) || 0)).toLocaleString()}
                        </p>
                      )}
                      <div className="space-y-2">
                        <Label>Alternativas de reparación (opcional)</Label>
                        <Textarea
                          value={presAlternativas}
                          onChange={(e) => setPresAlternativas(e.target.value)}
                          placeholder="Otras opciones de resolución..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Inspección vinculada <span className="text-red-500">*</span></Label>
                        <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                          Inspección #{inspecciones[0]?.id_inspeccion} — {inspecciones[0] ? format(new Date(inspecciones[0].fecha_inspeccion), "dd/MM/yy", { locale: es }) : ''}
                        </div>
                      </div>
                      <Button
                        onClick={handleCrearPresupuesto}
                        disabled={savingPresupuesto || !presDescripcion.trim()}
                        className="w-full gap-2"
                      >
                        {savingPresupuesto ? (
                          <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                        ) : (
                          <><Send className="h-4 w-4" />Enviar Presupuesto</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Tab Presupuesto (para clientes con presupuestos) */}
            {rol === 'cliente' && presupuestos.length > 0 && (
              <TabsContent value="presupuesto" className="mt-4">
                <PresupuestosClienteList
                  presupuestos={presupuestos as any}
                  onPresupuestoActualizado={() => cargarIncidente()}
                />
              </TabsContent>
            )}

            {/* Tab Calificación (para clientes cuando está resuelto) */}
            {rol === 'cliente' && incidente && incidente.estado_actual === EstadoIncidente.RESUELTO && asignaciones.length > 0 && (
              <TabsContent value="calificacion" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Califica al técnico que resolvió tu incidente
                  </p>
                  {asignaciones.map((asignacion) => (
                    <CalificacionTecnico
                      key={asignacion.id_asignacion}
                      incidenteId={incidente.id_incidente}
                      idTecnico={asignacion.id_tecnico}
                      nombreTecnico={`${asignacion.tecnicos?.nombre} ${asignacion.tecnicos?.apellido}`}
                      onCalificacionCreated={() => {
                        toast.success('¡Gracias por tu calificación!')
                      }}
                    />
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
          )
        })() : (
          <p className="text-center text-gray-500 py-8">
            No se pudo cargar el incidente
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
