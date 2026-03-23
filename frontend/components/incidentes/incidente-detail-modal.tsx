'use client'

import { useState, useEffect, useRef } from 'react'
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
  ChevronRight,
  Lock,
  Plus,
  CheckCircle2,
  Upload,
  ImageIcon,
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
import { crearAsignacion, completarAsignacion } from '@/features/asignaciones/asignaciones.service'
import { getTecnicosParaAsignacion } from '@/features/usuarios/usuarios.service'
import { getPresupuestosDelIncidente, crearPresupuesto } from '@/features/presupuestos/presupuestos.service'
import { getConformidadDelIncidente, crearConformidadPorTecnico } from '@/features/conformidades/conformidades.service'
import { crearAvance } from '@/features/avances/avances.service'
import { createClient } from '@/shared/lib/supabase/client'
import { PresupuestosClienteList } from '@/components/cliente/presupuestos-cliente-list'
import type { Presupuesto } from '@/features/presupuestos/presupuestos.types'
import type { Conformidad } from '@/features/conformidades/conformidades.types'
import type { Tecnico } from '@/features/usuarios/usuarios.types'

interface TimelineEventDetalle {
  label: string
  value: string
}

interface TimelineEvent {
  id: string
  tipo: 'creacion' | 'asignacion' | 'inspeccion' | 'presupuesto' | 'pago' | 'conformidad' | 'calificacion' | 'estado' | 'avance'
  titulo: string
  descripcion: string
  fecha: string
  icono: React.ReactNode
  color: string
  detalleItems?: TimelineEventDetalle[]
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
  initialTab?: string
  hideTabs?: boolean
}

// Estados que el admin puede asignar manualmente.
// 'resuelto' NO está incluido — solo se alcanza via aprobación de conformidad.
const ESTADOS_INCIDENTE = [
  'pendiente',
  'en_proceso',
]

const ESTADOS_LABELS: Record<string, string> = {
  'pendiente': 'Pendiente',
  'en_proceso': 'En Proceso',
  'asignacion_solicitada': 'Asignación solicitada',
  'resuelto': 'Resuelto',
}

const ESTADO_COLORS: Record<string, string> = {
  'pendiente': 'bg-yellow-100 text-yellow-800',
  'en_proceso': 'bg-blue-100 text-blue-800',
  'asignacion_solicitada': 'bg-purple-100 text-purple-800',
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

// ─────────────────────────────────────────────────────────────────────────────
// Stepper de flujo de trabajo para el técnico
// ─────────────────────────────────────────────────────────────────────────────
type StepStatus = 'completed' | 'active' | 'locked'

interface StepDef {
  id: number
  label: string
  sublabel: string
  tab: string
  status: StepStatus
}

function StepperTecnico({
  steps,
  activeTab,
  onStepClick,
}: {
  steps: StepDef[]
  activeTab: string
  onStepClick: (tab: string) => void
}) {
  const completedCount = steps.filter(s => s.status === 'completed').length

  return (
    <div className="space-y-1">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Flujo de trabajo</span>
        <span className="text-[10px] text-gray-400 font-medium">{completedCount}/{steps.length} completados</span>
      </div>

      {/* Step rows — each is a full-width nav item */}
      {steps.map((step) => {
        // Highlight the step whose tab is active AND is the "most relevant" for that tab
        // (when multiple steps share a tab, highlight the active/last-completed one)
        const stepsForTab = steps.filter(s => s.tab === step.tab)
        const relevantStep = stepsForTab.find(s => s.status === 'active') ??
          stepsForTab.filter(s => s.status === 'completed').at(-1) ??
          stepsForTab[0]
        const isSelected = activeTab === step.tab && relevantStep?.id === step.id
        const canClick = step.status !== 'locked'

        return (
          <button
            key={step.id}
            onClick={() => canClick && onStepClick(step.tab)}
            disabled={!canClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
              isSelected
                ? step.status === 'completed'
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-amber-50 border border-amber-200'
                : canClick
                ? 'bg-gray-50 border border-gray-100 hover:bg-gray-100 active:scale-[0.98]'
                : 'bg-gray-50 border border-gray-100 opacity-40 cursor-not-allowed'
            }`}
          >
            {/* Status circle */}
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step.status === 'completed'
                ? 'bg-emerald-500 text-white'
                : step.status === 'active'
                ? 'bg-amber-500 text-white'
                : 'bg-gray-200 text-gray-400'
            }`}>
              {step.status === 'completed' ? <CheckCircle className="w-3.5 h-3.5" /> : step.id}
            </div>

            {/* Label + sublabel */}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold leading-tight ${
                step.status === 'completed' ? 'text-emerald-700' :
                step.status === 'active' ? 'text-amber-700' : 'text-gray-400'
              }`}>
                {step.label}
              </p>
              <p className={`text-[10px] leading-tight mt-0.5 ${
                step.status === 'completed' ? 'text-emerald-500' :
                step.status === 'active' ? 'text-amber-500' : 'text-gray-300'
              }`}>
                {step.sublabel}
              </p>
            </div>

            {/* Right icon */}
            {canClick
              ? <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                  step.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
                }`} />
              : <Lock className="w-3.5 h-3.5 flex-shrink-0 text-gray-300" />
            }
          </button>
        )
      })}
    </div>
  )
}

export function IncidenteDetailModal({ incidenteId, open, onOpenChange, onUpdate, rol = 'admin', initialTab, hideTabs = false }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('detalles')
  const [incidente, setIncidente] = useState<IncidenteCompleto | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [inspecciones, setInspecciones] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [conformidad, setConformidad] = useState<Conformidad | null>(null)

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

  // State para acciones de ejecución (solo técnico)
  const [avanceDesc, setAvanceDesc] = useState('')
  const [avancePct, setAvancePct] = useState('')
  const [savingAvance, setSavingAvance] = useState(false)
  const [savingCompletar, setSavingCompletar] = useState(false)
  const [confirmandoCompletar, setConfirmandoCompletar] = useState(false)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const CATEGORIAS = Object.values(CategoriaIncidente) as string[]

  useEffect(() => {
    if (open && incidenteId) {
      setActiveTab(initialTab ?? 'detalles')
      cargarIncidente()
      if (rol === 'admin') {
        cargarTecnicos()
      }
    }
  }, [open, incidenteId, initialTab])

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
          const [inspeccionesData, presupuestosData, conformidadData] = await Promise.all([
            getInspeccionesDelIncidente(incidenteId),
            getPresupuestosDelIncidente(incidenteId),
            getConformidadDelIncidente(incidenteId),
          ])
          setInspecciones(inspeccionesData)
          setPresupuestos(presupuestosData)
          setConformidad(conformidadData)
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

    // Asignaciones — cada estado genera su propio evento con la fecha correcta
    asignacionesData?.forEach((asig: any) => {
      const tecnicoNombre = `${asig.tecnicos?.nombre || ''} ${asig.tecnicos?.apellido || ''}`.trim()
      const desc = tecnicoNombre || 'Sin técnico'

      // Evento de asignación (siempre)
      timelineEvents.push({
        id: `asig-pendiente-${asig.id_asignacion}`,
        tipo: 'asignacion',
        titulo: 'Técnico asignado',
        descripcion: desc,
        fecha: asig.fecha_asignacion,
        icono: <Wrench className="h-4 w-4" />,
        color: 'bg-orange-400',
      })

      // Evento de aceptación
      if (asig.fecha_aceptacion) {
        timelineEvents.push({
          id: `asig-aceptada-${asig.id_asignacion}`,
          tipo: 'asignacion',
          titulo: 'Técnico aceptó la asignación',
          descripcion: desc,
          fecha: asig.fecha_aceptacion,
          icono: <Wrench className="h-4 w-4" />,
          color: 'bg-purple-500',
        })
      }

      // Evento de rechazo (solo visible para admin/técnico)
      if (asig.fecha_rechazo && rolActual !== 'cliente') {
        timelineEvents.push({
          id: `asig-rechazada-${asig.id_asignacion}`,
          tipo: 'asignacion',
          titulo: 'Técnico rechazó la asignación',
          descripcion: desc,
          fecha: asig.fecha_rechazo,
          icono: <Wrench className="h-4 w-4" />,
          color: 'bg-red-500',
        })
      }

      // Evento de trabajo completado
      if (asig.estado_asignacion === 'completada') {
        timelineEvents.push({
          id: `asig-completada-${asig.id_asignacion}`,
          tipo: 'asignacion',
          titulo: 'Trabajo completado',
          descripcion: desc,
          fecha: asig.fecha_completado || asig.fecha_aceptacion || asig.fecha_asignacion,
          icono: <Wrench className="h-4 w-4" />,
          color: 'bg-green-500',
        })
      }
    })

    // Cargar inspecciones, presupuestos, pagos, avances y conformidades para timeline
    const { inspecciones, presupuestos, pagos, avances, conformidades } = await getTimelineData(incidenteData.id_incidente)

    inspecciones?.forEach((insp: any) => {
      const tecnicoNombre = insp.tecnicos ? `${insp.tecnicos.nombre} ${insp.tecnicos.apellido}`.trim() : null
      const detalle: TimelineEventDetalle[] = []
      if (tecnicoNombre) detalle.push({ label: 'Técnico', value: tecnicoNombre })
      if (insp.descripcion_inspeccion) detalle.push({ label: 'Descripción', value: insp.descripcion_inspeccion })
      if (insp.causas_determinadas) detalle.push({ label: 'Causas', value: insp.causas_determinadas })
      if (insp.danos_ocasionados) detalle.push({ label: 'Daños', value: insp.danos_ocasionados })
      if (insp.dias_estimados_trabajo) detalle.push({ label: 'Días estimados', value: String(insp.dias_estimados_trabajo) })

      timelineEvents.push({
        id: `insp-${insp.id_inspeccion}`,
        tipo: 'inspeccion',
        titulo: 'Inspección Realizada',
        descripcion: tecnicoNombre ? `Por ${tecnicoNombre}` : (insp.descripcion_inspeccion || 'Sin descripción'),
        fecha: insp.fecha_inspeccion,
        icono: <ClipboardList className="h-4 w-4" />,
        color: 'bg-orange-500',
        detalleItems: detalle.length > 0 ? detalle : undefined,
      })
    })

    avances?.forEach((av: any) => {
      if (rolActual === 'cliente') return // el cliente no ve avances técnicos
      const tecnicoNombre = av.tecnicos ? `${av.tecnicos.nombre} ${av.tecnicos.apellido}`.trim() : null
      const detalle: TimelineEventDetalle[] = []
      if (tecnicoNombre) detalle.push({ label: 'Técnico', value: tecnicoNombre })
      if (av.descripcion_avance) detalle.push({ label: 'Detalle', value: av.descripcion_avance })
      if (av.porcentaje_completado != null) detalle.push({ label: 'Progreso', value: `${av.porcentaje_completado}%` })
      if (av.observaciones) detalle.push({ label: 'Observaciones', value: av.observaciones })

      timelineEvents.push({
        id: `avance-${av.id_avance}`,
        tipo: 'avance',
        titulo: 'Avance de Reparación',
        descripcion: av.porcentaje_completado != null ? `${av.porcentaje_completado}% completado` : (av.descripcion_avance || 'Sin descripción'),
        fecha: av.fecha_avance,
        icono: <Wrench className="h-4 w-4" />,
        color: 'bg-indigo-500',
        detalleItems: detalle.length > 0 ? detalle : undefined,
      })
    })

    presupuestos?.forEach((pres: any) => {
      const detalleBase: TimelineEventDetalle[] = []
      if (pres.descripcion_detallada) detalleBase.push({ label: 'Descripción', value: pres.descripcion_detallada })
      if (pres.costo_materiales != null) detalleBase.push({ label: 'Materiales', value: `$${Number(pres.costo_materiales).toLocaleString()}` })
      if (pres.costo_mano_obra != null) detalleBase.push({ label: 'Mano de obra', value: `$${Number(pres.costo_mano_obra).toLocaleString()}` })
      if (pres.gastos_administrativos) detalleBase.push({ label: 'Gastos adm.', value: `$${Number(pres.gastos_administrativos).toLocaleString()}` })
      detalleBase.push({ label: 'Total', value: `$${(pres.costo_total ?? 0).toLocaleString()}` })
      if (pres.alternativas_reparacion) detalleBase.push({ label: 'Alternativas', value: pres.alternativas_reparacion })

      if (rolActual === 'cliente') {
        if (!['aprobado_admin', 'aprobado'].includes(pres.estado_presupuesto)) return
        timelineEvents.push({
          id: `pres-${pres.id_presupuesto}`,
          tipo: 'presupuesto',
          titulo: 'Presupuesto Recibido',
          descripcion: `La inmobiliaria te envió un presupuesto por $${(pres.costo_total ?? 0).toLocaleString()}`,
          fecha: pres.fecha_modificacion || pres.fecha_creacion,
          icono: <FileText className="h-4 w-4" />,
          color: 'bg-cyan-500',
          detalleItems: detalleBase,
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
          detalleItems: detalleBase,
        })
        if (['aprobado_admin', 'aprobado'].includes(pres.estado_presupuesto) && pres.fecha_modificacion) {
          timelineEvents.push({
            id: `pres-aprobado-admin-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: 'Presupuesto aprobado por administración',
            descripcion: `Costo final: $${(pres.costo_total ?? 0).toLocaleString()}`,
            fecha: pres.fecha_modificacion,
            icono: <CheckCircle className="h-4 w-4" />,
            color: 'bg-amber-500',
            detalleItems: detalleBase,
          })
        }
        if (pres.estado_presupuesto === 'aprobado' && pres.fecha_aprobacion) {
          timelineEvents.push({
            id: `pres-aprobado-cliente-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: 'Presupuesto aprobado por el cliente',
            descripcion: 'El cliente autorizó el trabajo — incidente en proceso',
            fecha: pres.fecha_aprobacion,
            icono: <CheckCircle className="h-4 w-4" />,
            color: 'bg-green-500',
          })
        }
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
      const detalle: TimelineEventDetalle[] = [
        { label: 'Monto', value: `$${(pago.monto_pagado ?? 0).toLocaleString()}` },
      ]
      if (pago.metodo_pago) detalle.push({ label: 'Método', value: pago.metodo_pago })
      if (pago.referencia_pago) detalle.push({ label: 'Referencia', value: pago.referencia_pago })
      if (pago.observaciones) detalle.push({ label: 'Observaciones', value: pago.observaciones })

      timelineEvents.push({
        id: `pago-${pago.id_pago}`,
        tipo: 'pago',
        titulo: `Pago Registrado`,
        descripcion: `$${(pago.monto_pagado ?? 0).toLocaleString()}${pago.metodo_pago ? ` — ${pago.metodo_pago}` : ''}`,
        fecha: pago.fecha_pago,
        icono: <DollarSign className="h-4 w-4" />,
        color: 'bg-green-500',
        detalleItems: detalle,
      })
    })

    // Conformidades
    conformidades?.forEach((conf: any) => {
      // Subida de foto
      timelineEvents.push({
        id: `conf-subida-${conf.id_conformidad}`,
        tipo: 'conformidad',
        titulo: 'Conformidad subida',
        descripcion: 'El técnico subió la foto de conformidad para revisión',
        fecha: conf.fecha_creacion,
        icono: <ClipboardList className="h-4 w-4" />,
        color: 'bg-amber-500',
      })

      // Rechazada
      if (conf.esta_rechazada && conf.fecha_rechazo) {
        timelineEvents.push({
          id: `conf-rechazada-${conf.id_conformidad}`,
          tipo: 'conformidad',
          titulo: 'Conformidad rechazada',
          descripcion: rolActual === 'cliente' ? 'La administración solicitó una nueva foto' : 'La conformidad fue rechazada — técnico debe resubir',
          fecha: conf.fecha_rechazo,
          icono: <XCircle className="h-4 w-4" />,
          color: 'bg-red-500',
        })
      }

      // Aprobada
      if ((conf.esta_firmada === 1 || conf.esta_firmada === true) && conf.fecha_conformidad) {
        timelineEvents.push({
          id: `conf-aprobada-${conf.id_conformidad}`,
          tipo: 'conformidad',
          titulo: 'Conformidad aprobada',
          descripcion: 'La administración aprobó la conformidad — incidente resuelto',
          fecha: conf.fecha_conformidad,
          icono: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-500',
        })
      }
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

  const handleAvance = async () => {
    if (!incidenteId || !avanceDesc.trim()) return
    setSavingAvance(true)
    try {
      const res = await crearAvance({
        id_incidente: incidenteId,
        descripcion_avance: avanceDesc.trim(),
        porcentaje_completado: avancePct ? parseInt(avancePct) : null,
      })
      if (res.success) {
        toast.success('Avance registrado')
        setAvanceDesc('')
        setAvancePct('')
        onUpdate?.()
      } else {
        toast.error(res.error ?? 'Error al registrar avance')
      }
    } finally {
      setSavingAvance(false)
    }
  }

  const handleCompletar = async () => {
    if (!incidenteId) return
    const asig = asignaciones.find(a => ['aceptada', 'en_curso'].includes(a.estado_asignacion))
    if (!asig) return
    setSavingCompletar(true)
    try {
      const res = await completarAsignacion(asig.id_asignacion)
      if (res.success) {
        toast.success('Trabajo marcado como completado')
        setConfirmandoCompletar(false)
        await cargarIncidente()
        onUpdate?.()
      } else {
        toast.error(res.error ?? 'Error al completar')
      }
    } finally {
      setSavingCompletar(false)
    }
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const handleSubirConformidad = async () => {
    if (!incidenteId || !fotoFile) return
    setUploadingFoto(true)
    try {
      const supabase = createClient()
      const ext = fotoFile.name.split('.').pop() || 'jpg'
      const path = `tecnico/${incidenteId}/${Date.now()}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('conformidades')
        .upload(path, fotoFile, { upsert: false })

      if (uploadError) {
        toast.error('Error al subir la foto: ' + uploadError.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('conformidades')
        .getPublicUrl(uploadData.path)

      const res = await crearConformidadPorTecnico(incidenteId, publicUrl)
      if (res.success) {
        toast.success('Conformidad enviada', { description: 'La administración revisará la foto y te notificará.' })
        setFotoFile(null)
        setFotoPreview(null)
        await cargarIncidente()
        onUpdate?.()
      } else {
        toast.error(res.error ?? 'Error al enviar conformidad')
      }
    } catch {
      toast.error('Error inesperado al subir la foto')
    } finally {
      setUploadingFoto(false)
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
      const idTecnicoActual = asignaciones.find(a =>
        a.estado_asignacion !== 'rechazada'
      )?.id_tecnico
      const inspeccionDelTecnico = inspecciones.find(i => i.id_tecnico === idTecnicoActual)
      const result = await crearPresupuesto({
        id_incidente: incidenteId,
        id_inspeccion: inspeccionDelTecnico?.id_inspeccion ?? null,
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
          const hasTecnicoTabs = rol === 'tecnico' && asignaciones.some(a => a.estado_asignacion !== 'rechazada')
          const hasClientePresupuesto = rol === 'cliente' && presupuestos.length > 0
          const hasCalificacion = rol === 'cliente' && incidente.estado_actual === EstadoIncidente.RESUELTO
          const tabCount = 2
            + (hasTecnicoTabs ? 2 : 0)
            + (rol === 'admin' ? 1 : 0)
            + (hasClientePresupuesto ? 1 : 0)
            + (hasCalificacion ? 1 : 0)
          const tabGridClass = tabCount === 3 ? 'grid-cols-3' : tabCount === 4 ? 'grid-cols-4' : 'grid-cols-2'

          // ── Stepper steps computation (solo para técnico) ─────────────────
          const inspeccionesActivas = inspecciones.filter(i => !i.esta_anulada)
          const presupuestosActivos = presupuestos.filter(p => p.estado_presupuesto !== EstadoPresupuesto.RECHAZADO)
          const tieneInspeccion = inspeccionesActivas.length > 0
          const tienePresupuesto = presupuestosActivos.length > 0
          const presupuestoAprobadoAdmin = presupuestosActivos.some(p =>
            [EstadoPresupuesto.APROBADO_ADMIN, EstadoPresupuesto.APROBADO].includes(p.estado_presupuesto as EstadoPresupuesto)
          )
          const presupuestoAprobadoCliente = presupuestosActivos.some(p =>
            p.estado_presupuesto === EstadoPresupuesto.APROBADO
          )
          const trabajoCompletado = asignaciones.some(a => a.estado_asignacion === 'completada')
          const tieneConformidad = !!conformidad

          const computeSteps = (): StepDef[] => {
            const s1: StepStatus = tieneInspeccion ? 'completed' : 'active'
            const s2: StepStatus = tienePresupuesto ? 'completed' : tieneInspeccion ? 'active' : 'locked'
            const s3: StepStatus = presupuestoAprobadoAdmin ? 'completed' : tienePresupuesto ? 'active' : 'locked'
            const s4: StepStatus = presupuestoAprobadoCliente ? 'completed' : presupuestoAprobadoAdmin ? 'active' : 'locked'
            const s5: StepStatus = trabajoCompletado ? 'completed' : presupuestoAprobadoCliente ? 'active' : 'locked'
            const s6: StepStatus = tieneConformidad ? 'completed' : trabajoCompletado ? 'active' : 'locked'
            return [
              { id: 1, label: 'Inspección', sublabel: tieneInspeccion ? 'Realizada' : 'Pendiente', tab: 'inspecciones', status: s1 },
              { id: 2, label: 'Presupuesto', sublabel: tienePresupuesto ? 'Enviado' : 'Pendiente', tab: 'presupuesto', status: s2 },
              { id: 3, label: 'Aprob. Admin', sublabel: presupuestoAprobadoAdmin ? 'Aprobado' : 'En revisión', tab: 'presupuesto', status: s3 },
              { id: 4, label: 'Aprob. Cliente', sublabel: presupuestoAprobadoCliente ? 'Aprobado' : 'En espera', tab: 'timeline', status: s4 },
              { id: 5, label: 'Ejecución', sublabel: trabajoCompletado ? 'Completado' : 'Por iniciar', tab: 'ejecucion', status: s5 },
              { id: 6, label: 'Conformidad', sublabel: tieneConformidad ? 'Enviada' : trabajoCompletado ? 'Pendiente' : 'Bloqueada', tab: 'conformidad', status: s6 },
            ]
          }

          const steps = computeSteps()

          return (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            {hasTecnicoTabs ? (
              <>
                {/* ── Info tabs (Detalles / Timeline) — ocultos en modo enfocado ── */}
                {!hideTabs && (
                  <div className="mb-3">
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['detalles', 'timeline'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === tab
                              ? 'bg-gray-900 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {tab === 'detalles' ? 'Detalles' : 'Timeline'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Stepper — visible cuando no es info tab (detalles/timeline) ── */}
                {(!hideTabs || ['inspecciones', 'presupuesto', 'ejecucion', 'conformidad'].includes(activeTab)) && (
                  <div className="mb-4 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <StepperTecnico steps={steps} activeTab={activeTab} onStepClick={setActiveTab} />
                  </div>
                )}
              </>
            ) : (
              !hideTabs && (
                <TabsList className={`grid w-full ${tabGridClass}`}>
                  <TabsTrigger value="detalles">Detalles</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  {hasClientePresupuesto && <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>}
                  {hasCalificacion && <TabsTrigger value="calificacion">Calificar</TabsTrigger>}
                  {rol === 'admin' && <TabsTrigger value="gestion">Gestión</TabsTrigger>}
                </TabsList>
              )
            )}

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
                      {timeline.map((event) => {
                        const isExpanded = expandedEventId === event.id
                        const hasDetail = event.detalleItems && event.detalleItems.length > 0
                        return (
                          <div key={event.id} className="relative flex gap-3">
                            <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${event.color} text-white`}>
                              {event.icono}
                            </div>
                            <div className="flex-1 pb-2">
                              <button
                                onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                                className={`w-full text-left ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium">{event.titulo}</p>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-xs text-gray-500">
                                      {new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(event.fecha))}
                                    </span>
                                    {hasDetail && (
                                      <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">{event.descripcion}</p>
                              </button>
                              {isExpanded && hasDetail && (
                                <div className="mt-2 rounded-md border bg-gray-50 p-3 space-y-1.5">
                                  {event.detalleItems!.map((item, i) => (
                                    <div key={i} className="grid grid-cols-[100px_1fr] gap-2 text-xs">
                                      <span className="font-medium text-gray-500">{item.label}</span>
                                      <span className="text-gray-800">{item.value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
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
            {hasTecnicoTabs && incidente && (
              <TabsContent value="inspecciones" className="mt-4">
                <InspeccionesList
                  incidenteId={incidente.id_incidente}
                  idTecnico={asignaciones.find(a => a.estado_asignacion !== 'rechazada')?.id_tecnico || 0}
                  inspecciones={inspeccionesActivas}
                  puedeCrearNueva={presupuestos.some(p => p.estado_presupuesto === EstadoPresupuesto.RECHAZADO)}
                  onInspeccionCreated={() => cargarIncidente()}
                  onInspeccionDeleted={() => cargarIncidente()}
                />
              </TabsContent>
            )}

            {/* Tab Presupuesto (para técnicos con asignación confirmada) */}
            {hasTecnicoTabs && incidente && (
              <TabsContent value="presupuesto" className="mt-4 space-y-4">
                {(() => {
                  const tienePresupuestoActivo = presupuestosActivos.length > 0
                  return (
                    <>
                      {presupuestosActivos.length > 0 && (
                        <div className="space-y-4">
                          {presupuestosActivos.map((pres) => {
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
                      )}
                      {!tienePresupuestoActivo && (inspeccionesActivas.length === 0 ? (
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
                          Inspección #{inspeccionesActivas[0]?.id_inspeccion} — {inspeccionesActivas[0] ? format(new Date(inspeccionesActivas[0].fecha_inspeccion), "dd/MM/yy", { locale: es }) : ''}
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
                      ))}
                    </>
                  )
                })()}
              </TabsContent>
            )}

            {/* Tab Ejecución (para técnicos con presupuesto aprobado) */}
            {hasTecnicoTabs && incidente && (
              <TabsContent value="ejecucion" className="mt-4 space-y-5">
                {!presupuestoAprobadoCliente ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-start gap-3">
                    <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Presupuesto pendiente de aprobación</p>
                      <p>El cliente debe aprobar el presupuesto antes de que puedas iniciar el trabajo.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Estado del trabajo */}
                    {trabajoCompletado ? (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-emerald-800">Trabajo completado</p>
                          <p className="text-xs text-emerald-600">Procedé a cargar la conformidad firmada en el siguiente paso.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Registrar avance */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-gray-600 flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Registrar Avance
                          </h4>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="modal-avance-desc">Descripción del avance <span className="text-red-500">*</span></Label>
                              <Textarea
                                id="modal-avance-desc"
                                value={avanceDesc}
                                onChange={(e) => setAvanceDesc(e.target.value)}
                                placeholder="Describe qué trabajo se realizó..."
                                rows={3}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="modal-avance-pct">Porcentaje completado (opcional)</Label>
                              <input
                                id="modal-avance-pct"
                                type="number"
                                min={0}
                                max={100}
                                value={avancePct}
                                onChange={(e) => setAvancePct(e.target.value)}
                                placeholder="0–100"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                              />
                            </div>
                            <Button
                              onClick={handleAvance}
                              disabled={savingAvance || !avanceDesc.trim()}
                              className="w-full gap-2"
                            >
                              {savingAvance ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : <><Plus className="h-4 w-4" />Guardar Avance</>}
                            </Button>
                          </div>
                        </div>

                        <Separator />

                        {/* Completar trabajo */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-gray-600 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Completar Trabajo
                          </h4>
                          {!confirmandoCompletar ? (
                            <Button
                              variant="outline"
                              className="w-full gap-2 text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => setConfirmandoCompletar(true)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Marcar como completado
                            </Button>
                          ) : (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
                              <p className="text-sm text-green-800">
                                ¿Confirmás que el trabajo fue finalizado? Después deberás subir la conformidad firmada por el cliente.
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfirmandoCompletar(false)}
                                  disabled={savingCompletar}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 gap-2"
                                  onClick={handleCompletar}
                                  disabled={savingCompletar}
                                >
                                  {savingCompletar ? <><Loader2 className="h-4 w-4 animate-spin" />Procesando...</> : 'Sí, completar'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </TabsContent>
            )}

            {/* Tab Conformidad (para técnicos con trabajo completado) */}
            {hasTecnicoTabs && incidente && (
              <TabsContent value="conformidad" className="mt-4 space-y-4">
                {!trabajoCompletado ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-start gap-3">
                    <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Trabajo no completado</p>
                      <p>Debés completar el trabajo antes de poder cargar la conformidad.</p>
                    </div>
                  </div>
                ) : conformidad ? (
                  <div className={`rounded-lg border p-4 space-y-3 ${
                    (conformidad.esta_firmada === true || conformidad.esta_firmada === 1)
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    {(conformidad.esta_firmada === true || conformidad.esta_firmada === 1) ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <p className="text-sm font-semibold text-emerald-800">Conformidad aprobada — incidente resuelto</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                        <p className="text-sm font-semibold text-amber-800">Conformidad en revisión por la administración</p>
                      </div>
                    )}
                    {conformidad.url_documento && (
                      <a
                        href={conformidad.url_documento}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        Ver documento subido
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Tomá una foto de la conformidad física firmada por el cliente y subila aquí. La administración la revisará para cerrar el incidente.
                    </p>
                    <div className="space-y-2">
                      <Label>Foto de la conformidad <span className="text-red-500">*</span></Label>
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {fotoPreview ? (
                          <img src={fotoPreview} alt="Preview" className="max-h-48 mx-auto rounded-md object-contain" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-gray-500">
                            <ImageIcon className="h-10 w-10 text-gray-400" />
                            <p className="text-sm font-medium">Tocá para seleccionar una foto</p>
                            <p className="text-xs text-gray-400">JPG, PNG, HEIC — máx. 10 MB</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFotoChange}
                      />
                      {fotoFile && (
                        <p className="text-xs text-gray-500">{fotoFile.name} ({(fotoFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                      )}
                    </div>
                    <Button
                      onClick={handleSubirConformidad}
                      disabled={uploadingFoto || !fotoFile}
                      className="w-full gap-2"
                    >
                      {uploadingFoto ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Subiendo...</>
                      ) : (
                        <><Upload className="h-4 w-4" />Enviar Conformidad</>
                      )}
                    </Button>
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
