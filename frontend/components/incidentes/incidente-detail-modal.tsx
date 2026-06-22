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
  X,
  Check,
  UserX,
  CalendarDays,
} from 'lucide-react'
import { EstadoIncidente, EstadoPresupuesto } from '@/shared/types/enums'
import { SUB_ESTADO_EN_PROCESO_CONFIG } from '@/shared/utils/colors'
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
import { getTecnicosParaAsignacion, getEspecialidadesActivas, getFiabilidadTecnicos } from '@/features/usuarios/usuarios.service'
import type { FiabilidadTecnico } from '@/features/usuarios/usuarios.service'
import { getPresupuestosDelIncidente, crearPresupuesto, aprobarPresupuesto, rechazarPresupuesto, responderOportunidadTecnico } from '@/features/presupuestos/presupuestos.service'
import { getConformidadDelIncidente, crearConformidadPorTecnico, aprobarConformidad, rechazarConformidad } from '@/features/conformidades/conformidades.service'
import { crearAvance } from '@/features/avances/avances.service'
import { getFranjasDisponibilidad, guardarFranjasDisponibilidad, getCompromisoDeAsignacion, guardarCompromisoTecnico } from '@/features/disponibilidad/disponibilidad.service'
import { CalendarioDisponibilidad } from '@/components/ui/calendario-disponibilidad'
import type { FranjaInput } from '@/components/ui/calendario-disponibilidad'
import type { CompromisoTecnico } from '@/features/disponibilidad/disponibilidad.types'
import { getVisitaActivaDeIncidente, getVisitaActivaPorTipo, getVisitasDeIncidente as getVisitasDeIncidenteTimeline } from '@/features/visitas/visitas.service'
import type { VisitaResumen } from '@/features/visitas/visitas.types'
import { PropVisitaSection } from '@/components/tecnico/proponer-visita-section.client'
import { ConfirmarVisitaPanel } from '@/components/cliente/confirmar-visita-panel.client'
import { createClient } from '@/shared/lib/supabase/client'
import { PresupuestosClienteList } from '@/components/cliente/presupuestos-cliente-list'
import { getMisPagosDeIncidente } from '@/features/pagos/cobros-clientes.service'
import type { MiCobroPendiente, MiCobroRealizado } from '@/features/pagos/cobros-clientes.service'
import { getMisPagosTecnicoDeIncidente } from '@/features/pagos/pagos-tecnicos.service'
import type { MiPagoPendiente, MiPagoRecibido } from '@/features/pagos/pagos-tecnicos.service'
import type { Presupuesto } from '@/features/presupuestos/presupuestos.types'
import type { Conformidad } from '@/features/conformidades/conformidades.types'
import type { Tecnico } from '@/features/usuarios/usuarios.types'

interface TimelineEventDetalle {
  label: string
  value: string
}

interface TimelineEventMetadata {
  // presupuesto
  descripcion_detallada?: string | null
  costo_materiales?: number | null
  costo_mano_obra?: number | null
  costo_total?: number | null
  alternativas?: string | null
  // conformidad
  url_documento?: string | null
  url_comprobante_compras?: string | null
  observaciones?: string | null
  // pago
  monto?: number | null
  metodo_pago?: string | null
  referencia_pago?: string | null
}

interface TimelineEvent {
  id: string
  tipo: 'creacion' | 'asignacion' | 'inspeccion' | 'presupuesto' | 'pago' | 'conformidad' | 'calificacion' | 'estado' | 'avance' | 'visita'
  titulo: string
  descripcion: string
  fecha: string
  icono: React.ReactNode
  color: string
  detalleItems?: TimelineEventDetalle[]
  metadata?: TimelineEventMetadata
}

interface IncidenteCompleto {
  id_incidente: number
  descripcion_problema: string
  disponibilidad: string | null
  url_foto_diagnostico: string | null
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
  onDarBaja?: (incidenteId: number) => void
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
  'finalizado': 'Finalizado',
}

const ESTADO_COLORS: Record<string, string> = {
  'pendiente': 'bg-amber-100 text-amber-800',
  'en_proceso': 'bg-orange-100 text-orange-800',
  'asignacion_solicitada': 'bg-blue-100 text-blue-800',
  'resuelto': 'bg-emerald-100 text-emerald-800',
  'finalizado': 'bg-emerald-100 text-emerald-800',
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

function DisponibilidadReparacionPanel({
  idIncidente,
  franjasActuales,
  onGuardar,
}: {
  idIncidente: number
  franjasActuales: FranjaInput[]
  onGuardar: () => void
}) {
  const [franjas, setFranjas] = useState<FranjaInput[]>(franjasActuales)
  const [guardando, setGuardando] = useState(false)

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const res = await guardarFranjasDisponibilidad(
        idIncidente,
        franjas.map(f => ({ fecha: f.fecha, hora_inicio: f.hora_inicio, hora_fin: f.hora_fin })),
        'reparacion',
      )
      if (res.success) {
        toast.success('Disponibilidad para la obra guardada')
        onGuardar()
      } else {
        toast.error(res.error ?? 'Error al guardar')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <CalendarDays className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800">Coordinación de la obra</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            El presupuesto fue aprobado. Para que el técnico pueda iniciar la obra,
            indicá en qué días y horarios podés recibir la visita.
          </p>
        </div>
      </div>

      {franjasActuales.length > 0 && (
        <div className="bg-amber-100/60 rounded-lg px-3 py-2 text-[11px] text-amber-800">
          <span className="font-semibold">Disponibilidad actual registrada</span> — podés actualizarla si cambió.
        </div>
      )}

      <CalendarioDisponibilidad
        modo="editar"
        franjas={franjas}
        onChange={setFranjas}
      />

      <button
        onClick={handleGuardar}
        disabled={guardando || franjas.length === 0}
        className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
      >
        {guardando ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
        ) : (
          <><CalendarDays className="w-4 h-4" />{franjasActuales.length > 0 ? 'Actualizar disponibilidad' : 'Confirmar disponibilidad'}</>
        )}
      </button>
    </div>
  )
}

export function IncidenteDetailModal({ incidenteId, open, onOpenChange, onUpdate, onDarBaja, rol = 'admin', initialTab, hideTabs = false }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('detalles')
  const [incidente, setIncidente] = useState<IncidenteCompleto | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [avancesRegistrados, setAvancesRegistrados] = useState<any[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [fiabilidad, setFiabilidad] = useState<Record<number, FiabilidadTecnico>>({})
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [inspecciones, setInspecciones] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [conformidad, setConformidad] = useState<Conformidad | null>(null)
  const [franjas, setFranjas] = useState<FranjaInput[]>([])
  const [franjasReparacion, setFranjasReparacion] = useState<FranjaInput[]>([])
  const [compromiso, setCompromiso] = useState<CompromisoTecnico | null>(null)
  const [visitaActiva, setVisitaActiva] = useState<VisitaResumen | null>(null)
  const [visitaReparacionActiva, setVisitaReparacionActiva] = useState<VisitaResumen | null>(null)

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
  const [savingOportunidad, setSavingOportunidad] = useState(false)

  // State para acciones de admin (aprobar/rechazar presupuesto y conformidad)
  const [gastosAdmin, setGastosAdmin] = useState('')
  const [puntuacionAdmin, setPuntuacionAdmin] = useState(5)
  const [comentariosAdmin, setComentariosAdmin] = useState('')
  const [resolvioProbAdmin, setResolvioProbAdmin] = useState(true)
  const [savingPresupuestoAdmin, setSavingPresupuestoAdmin] = useState(false)
  const [savingConformidadAdmin, setSavingConformidadAdmin] = useState(false)

  // State para acciones de ejecución (solo técnico)
  const [avanceDesc, setAvanceDesc] = useState('')
  const [avancePct, setAvancePct] = useState('')
  const [savingAvance, setSavingAvance] = useState(false)
  const [savingCompletar, setSavingCompletar] = useState(false)
  const [confirmandoCompletar, setConfirmandoCompletar] = useState(false)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const comprobanteInputRef = useRef<HTMLInputElement>(null)

  const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>([])
  const [pagosIncidente, setPagosIncidente] = useState<{ pendiente: MiCobroPendiente | null, realizados: MiCobroRealizado[] } | null>(null)
  const [pagosTecnicoIncidente, setPagosTecnicoIncidente] = useState<{ pendiente: MiPagoPendiente | null, recibidos: MiPagoRecibido[] } | null>(null)
  const [cargandoPagos, setCargandoPagos] = useState(false)

  useEffect(() => {
    if (open && incidenteId) {
      setActiveTab(initialTab ?? 'detalles')
      setPagosIncidente(null)
      setPagosTecnicoIncidente(null)
      cargarIncidente()
      if (rol === 'admin') {
        cargarTecnicos()
        getEspecialidadesActivas().then((data) => {
          setCategoriasDisponibles(data.map((e: { nombre: string }) => e.nombre))
        }).catch(() => {})
      }
    }
  }, [open, incidenteId, initialTab])

  useEffect(() => {
    if (activeTab === 'pagos' && incidenteId) {
      if (rol === 'cliente' && !pagosIncidente) {
        setCargandoPagos(true)
        getMisPagosDeIncidente(incidenteId)
          .then(setPagosIncidente)
          .catch(() => setPagosIncidente({ pendiente: null, realizados: [] }))
          .finally(() => setCargandoPagos(false))
      } else if (rol === 'tecnico' && !pagosTecnicoIncidente) {
        setCargandoPagos(true)
        getMisPagosTecnicoDeIncidente(incidenteId)
          .then(setPagosTecnicoIncidente)
          .catch(() => setPagosTecnicoIncidente({ pendiente: null, recibidos: [] }))
          .finally(() => setCargandoPagos(false))
      }
    }
  }, [activeTab, rol, incidenteId])

  const cargarTecnicos = async () => {
    try {
      const [data, fData] = await Promise.all([
        getTecnicosParaAsignacion(),
        getFiabilidadTecnicos(),
      ])
      setTecnicos(data)
      setFiabilidad(fData)
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
      if (rol === 'tecnico' || rol === 'admin') {
        try {
          const [inspeccionesData, presupuestosData, conformidadData, franjasData, franjasReparData, visitaData, visitaReparData] = await Promise.all([
            getInspeccionesDelIncidente(incidenteId),
            getPresupuestosDelIncidente(incidenteId),
            getConformidadDelIncidente(incidenteId),
            getFranjasDisponibilidad(incidenteId, 'inspeccion'),
            getFranjasDisponibilidad(incidenteId, 'reparacion'),
            getVisitaActivaDeIncidente(incidenteId),
            getVisitaActivaPorTipo(incidenteId, 'reparacion'),
          ])
          setInspecciones(inspeccionesData)
          setPresupuestos(presupuestosData)
          setConformidad(conformidadData)
          setFranjas(franjasData as FranjaInput[])
          setFranjasReparacion(franjasReparData as FranjaInput[])
          setVisitaActiva(visitaData)
          setVisitaReparacionActiva(visitaReparData)

          // Para técnico: cargar compromiso de la asignación activa
          if (rol === 'tecnico') {
            const asigActiva = asignacionesData.find((a: any) =>
              ['aceptada', 'en_curso', 'completada'].includes(a.estado_asignacion)
            ) as any
            if (asigActiva?.id_asignacion) {
              const comp = await getCompromisoDeAsignacion(asigActiva.id_asignacion)
              setCompromiso(comp)
            }
          }
        } catch (error) {
          console.error('Error al cargar datos:', error)
        }
      }

      if (rol === 'cliente') {
        try {
          const [presupuestosData, visitaData, franjasData, franjasReparData] = await Promise.all([
            getPresupuestosDelIncidente(incidenteId),
            getVisitaActivaDeIncidente(incidenteId),
            getFranjasDisponibilidad(incidenteId, 'inspeccion'),
            getFranjasDisponibilidad(incidenteId, 'reparacion'),
          ])
          // El cliente solo ve presupuestos que la inmobiliaria ya aprobó y ajustó.
          const visiblesParaCliente = presupuestosData.filter(p =>
            [EstadoPresupuesto.APROBADO_ADMIN, EstadoPresupuesto.APROBADO].includes(p.estado_presupuesto as EstadoPresupuesto)
          )
          setPresupuestos(visiblesParaCliente)
          setVisitaActiva(visitaData)
          setFranjas(franjasData as FranjaInput[])
          setFranjasReparacion(franjasReparData as FranjaInput[])
        } catch (error) {
          console.error('Error al cargar datos del cliente:', error)
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
    // Normaliza fechas sin info de timezone a UTC (columnas timestamp sin timestamptz)
    const toUTC = (d: string | null | undefined): string | undefined => {
      if (!d) return undefined
      if (d.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(d)) return d
      return d + 'Z'
    }
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

      // Solicitud enviada al técnico (pendiente de aceptación)
      timelineEvents.push({
        id: `asig-pendiente-${asig.id_asignacion}`,
        tipo: 'asignacion',
        titulo: 'Solicitud enviada al técnico',
        descripcion: desc,
        fecha: asig.fecha_asignacion,
        icono: <Wrench className="h-4 w-4" />,
        color: 'bg-blue-400',
      })

      // Técnico aceptó → trabajo iniciado
      if (asig.fecha_aceptacion) {
        timelineEvents.push({
          id: `asig-aceptada-${asig.id_asignacion}`,
          tipo: 'asignacion',
          titulo: 'Técnico aceptó — trabajo iniciado',
          descripcion: desc,
          fecha: asig.fecha_aceptacion,
          icono: <Wrench className="h-4 w-4" />,
          color: 'bg-orange-400',
        })
      }

      // Técnico rechazó la solicitud (solo admin/técnico)
      if (asig.estado_asignacion === 'rechazada' && asig.fecha_rechazo && rolActual !== 'cliente') {
        timelineEvents.push({
          id: `asig-rechazada-${asig.id_asignacion}`,
          tipo: 'asignacion',
          titulo: 'Técnico rechazó la solicitud',
          descripcion: desc,
          fecha: asig.fecha_rechazo,
          icono: <XCircle className="h-4 w-4" />,
          color: 'bg-red-500',
        })
      }

      // Técnico canceló un trabajo ya aceptado (admin ve detalle, cliente ve mensaje genérico)
      if (asig.estado_asignacion === 'cancelada' && asig.fecha_rechazo) {
        timelineEvents.push({
          id: `asig-cancelada-${asig.id_asignacion}`,
          tipo: 'asignacion',
          titulo: 'Técnico canceló el trabajo',
          descripcion: rolActual === 'cliente'
            ? 'El servicio volverá a asignarse'
            : `${desc} — el incidente volvió a pendiente`,
          fecha: asig.fecha_rechazo,
          icono: <XCircle className="h-4 w-4" />,
          color: 'bg-red-600',
        })
      }

      // "completada" queda cubierto por los eventos de conformidad — no duplicar
    })

    // Cargar inspecciones, presupuestos, pagos, avances, conformidades y visitas para timeline
    const [{ inspecciones, presupuestos, pagos, avances, conformidades }, visitasTimeline] = await Promise.all([
      getTimelineData(incidenteData.id_incidente),
      getVisitasDeIncidenteTimeline(incidenteData.id_incidente),
    ])

    // Visitas — aparecen en el timeline para admin y técnico
    visitasTimeline?.forEach((v) => {
      if (rolActual === 'cliente') return
      const ESTADO_VISITA: Record<string, { titulo: string; color: string }> = {
        propuesta:  { titulo: 'Visita propuesta',   color: 'bg-violet-400' },
        confirmada: { titulo: 'Visita confirmada',  color: 'bg-teal-500'   },
        completada: { titulo: 'Visita completada',  color: 'bg-teal-600'   },
        cancelada:  { titulo: 'Visita cancelada',   color: 'bg-gray-400'   },
        rechazada:  { titulo: 'Visita rechazada',   color: 'bg-red-400'    },
      }
      const TIPO_LABELS: Record<string, string> = {
        inspeccion:  'Inspección inicial',
        reparacion:  'Reparación',
        seguimiento: 'Seguimiento',
      }
      const TIPO_COLOR: Record<string, string> = {
        inspeccion:  'bg-cyan-500',
        reparacion:  'bg-amber-500',
        seguimiento: 'bg-purple-500',
      }
      const tipoColor = TIPO_COLOR[v.tipo] ?? 'bg-gray-400'
      const cfg = {
        ...( ESTADO_VISITA[v.estado] ?? { titulo: 'Visita', color: 'bg-gray-400' }),
        color: tipoColor,
      }
      const tipoLabel = TIPO_LABELS[v.tipo] ?? v.tipo
      const detalle: TimelineEventDetalle[] = [
        { label: 'Tipo', value: tipoLabel },
        { label: 'Hora', value: `${v.hora_inicio}${v.hora_fin_estimada ? ` – ${v.hora_fin_estimada}` : ''}` },
        { label: 'Estado', value: ESTADO_VISITA[v.estado]?.titulo ?? v.estado },
        ...(v.fuera_de_disponibilidad ? [{ label: 'Aviso', value: 'Fuera de disponibilidad declarada' }] : []),
        ...(v.notas_tecnico ? [{ label: 'Notas', value: v.notas_tecnico }] : []),
      ]
      timelineEvents.push({
        id: `visita-${v.id_visita}`,
        tipo: 'visita',
        titulo: `${ESTADO_VISITA[v.estado]?.titulo ?? 'Visita'} · ${tipoLabel}`,
        descripcion: new Date(v.fecha_visita + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }),
        fecha: v.fecha_creacion,
        icono: <CalendarDays className="h-4 w-4" />,
        color: cfg.color,
        detalleItems: detalle,
      })
    })

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
      const presMeta: TimelineEventMetadata = {
        descripcion_detallada: pres.descripcion_detallada,
        costo_materiales: pres.costo_materiales,
        costo_mano_obra: pres.costo_mano_obra,
        costo_total: pres.costo_total,
        alternativas: pres.alternativas_reparacion,
      }
      if (rolActual === 'cliente') {
        if (['aprobado_admin', 'aprobado'].includes(pres.estado_presupuesto)) {
          timelineEvents.push({
            id: `pres-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: 'Presupuesto Recibido',
            descripcion: `La inmobiliaria te envió un presupuesto por $${(pres.costo_total ?? 0).toLocaleString()}`,
            fecha: pres.fecha_modificacion || pres.fecha_creacion,
            icono: <FileText className="h-4 w-4" />,
            color: SUB_ESTADO_EN_PROCESO_CONFIG.presupuesto_enviado.timelineColor,
            metadata: presMeta,
          })
          if (pres.estado_presupuesto === 'aprobado' && pres.fecha_aprobacion) {
            timelineEvents.push({
              id: `pres-aprobado-${pres.id_presupuesto}`,
              tipo: 'presupuesto',
              titulo: 'Presupuesto Aprobado',
              descripcion: `Aprobaste el presupuesto por $${(pres.costo_total ?? 0).toLocaleString()}`,
              fecha: pres.fecha_aprobacion,
              icono: <CheckCircle className="h-4 w-4" />,
              color: SUB_ESTADO_EN_PROCESO_CONFIG.en_curso.timelineColor,
              metadata: presMeta,
            })
          }
        } else if (pres.estado_presupuesto === 'rechazado' && pres.rechazado_por === 'cliente' && pres.fecha_modificacion) {
          timelineEvents.push({
            id: `pres-recibido-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: 'Presupuesto Recibido',
            descripcion: `La inmobiliaria te envió un presupuesto por $${(pres.costo_total ?? 0).toLocaleString()}`,
            fecha: pres.fecha_creacion,
            icono: <FileText className="h-4 w-4" />,
            color: SUB_ESTADO_EN_PROCESO_CONFIG.presupuesto_enviado.timelineColor,
            metadata: presMeta,
          })
          timelineEvents.push({
            id: `pres-rechazado-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: 'Rechazaste el presupuesto',
            descripcion: 'Optaste por cambiar de técnico — el incidente volvió a estado Pendiente',
            fecha: pres.fecha_modificacion,
            icono: <XCircle className="h-4 w-4" />,
            color: 'bg-red-500',
            metadata: presMeta,
          })
        }
      } else if (rolActual === 'tecnico') {
        timelineEvents.push({
          id: `pres-${pres.id_presupuesto}`,
          tipo: 'presupuesto',
          titulo: 'Presupuesto enviado a la inmobiliaria',
          descripcion: `Total: $${(pres.costo_total ?? 0).toLocaleString()}`,
          fecha: pres.fecha_creacion,
          icono: <FileText className="h-4 w-4" />,
          color: SUB_ESTADO_EN_PROCESO_CONFIG.presupuesto_enviado.timelineColor,
          metadata: presMeta,
        })
        if (['aprobado_admin', 'aprobado'].includes(pres.estado_presupuesto) && pres.fecha_modificacion) {
          timelineEvents.push({
            id: `pres-aprobado-admin-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: 'Presupuesto aprobado por la inmobiliaria',
            descripcion: `Total: $${(pres.costo_total ?? 0).toLocaleString()}`,
            fecha: pres.fecha_modificacion,
            icono: <CheckCircle className="h-4 w-4" />,
            color: SUB_ESTADO_EN_PROCESO_CONFIG.presupuesto_cliente.timelineColor,
            metadata: presMeta,
          })
        }
        if (pres.estado_presupuesto === 'aprobado' && pres.fecha_aprobacion) {
          timelineEvents.push({
            id: `pres-aprobado-cliente-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: 'Cliente aprobó el presupuesto',
            descripcion: 'Ya podés comenzar el trabajo',
            fecha: pres.fecha_aprobacion,
            icono: <CheckCircle className="h-4 w-4" />,
            color: SUB_ESTADO_EN_PROCESO_CONFIG.en_curso.timelineColor,
            metadata: presMeta,
          })
        }
        if (pres.estado_presupuesto === 'rechazado' && pres.fecha_modificacion) {
          const rechazadoPorCliente = pres.rechazado_por === 'cliente'
          timelineEvents.push({
            id: `pres-rechazado-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: rechazadoPorCliente ? 'Presupuesto rechazado por el cliente' : 'Presupuesto rechazado por la inmobiliaria',
            descripcion: rechazadoPorCliente ? 'El cliente rechazó el presupuesto — se buscará otro técnico' : 'Deberás enviar un nuevo presupuesto',
            fecha: pres.fecha_modificacion,
            icono: <XCircle className="h-4 w-4" />,
            color: 'bg-red-500',
            metadata: presMeta,
          })
        }
      } else {
        // Admin: ve el flujo completo
        timelineEvents.push({
          id: `pres-${pres.id_presupuesto}`,
          tipo: 'presupuesto',
          titulo: 'Presupuesto Enviado',
          descripcion: `Total: $${(pres.costo_total ?? 0).toLocaleString()}`,
          fecha: pres.fecha_creacion,
          icono: <FileText className="h-4 w-4" />,
          color: SUB_ESTADO_EN_PROCESO_CONFIG.presupuesto_enviado.timelineColor,
          metadata: presMeta,
        })
        if (['aprobado_admin', 'aprobado'].includes(pres.estado_presupuesto) && pres.fecha_modificacion) {
          timelineEvents.push({
            id: `pres-aprobado-admin-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: 'Presupuesto aprobado por administración',
            descripcion: `Costo final: $${(pres.costo_total ?? 0).toLocaleString()}`,
            fecha: pres.fecha_modificacion,
            icono: <CheckCircle className="h-4 w-4" />,
            color: SUB_ESTADO_EN_PROCESO_CONFIG.presupuesto_cliente.timelineColor,
            metadata: presMeta,
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
            color: SUB_ESTADO_EN_PROCESO_CONFIG.en_curso.timelineColor,
            metadata: presMeta,
          })
        }
        if (pres.estado_presupuesto === 'rechazado' && pres.fecha_modificacion) {
          const rechazadoPorCliente = pres.rechazado_por === 'cliente'
          timelineEvents.push({
            id: `pres-rechazado-${pres.id_presupuesto}`,
            tipo: 'presupuesto',
            titulo: rechazadoPorCliente ? 'Presupuesto rechazado por el cliente' : 'Presupuesto rechazado por administración',
            descripcion: rechazadoPorCliente ? 'El cliente rechazó el presupuesto — se buscará otro técnico' : 'El técnico deberá enviar un nuevo presupuesto',
            fecha: pres.fecha_modificacion,
            icono: <XCircle className="h-4 w-4" />,
            color: 'bg-red-500',
            metadata: presMeta,
          })
        }
      }
    })

    pagos?.forEach((pago: any) => {
      timelineEvents.push({
        id: `pago-${pago.id_pago}`,
        tipo: 'pago',
        titulo: `Pago Registrado`,
        descripcion: `$${(pago.monto_pagado ?? 0).toLocaleString()}${pago.metodo_pago ? ` — ${pago.metodo_pago}` : ''}`,
        fecha: pago.fecha_pago,
        icono: <DollarSign className="h-4 w-4" />,
        color: 'bg-green-500',
        metadata: {
          monto: pago.monto_pagado,
          metodo_pago: pago.metodo_pago,
          referencia_pago: pago.referencia_pago,
          observaciones: pago.observaciones,
        },
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
        color: SUB_ESTADO_EN_PROCESO_CONFIG.completada_pendiente.timelineColor,
        metadata: {
          url_documento: conf.url_documento,
          url_comprobante_compras: conf.url_comprobante_compras,
          observaciones: conf.observaciones,
        },
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
          color: SUB_ESTADO_EN_PROCESO_CONFIG.conformidad_rechazada.timelineColor,
        })
      }

      // Aprobada
      if ((conf.esta_firmada === 1 || conf.esta_firmada === true) && conf.fecha_conformidad) {
        timelineEvents.push({
          id: `conf-aprobada-${conf.id_conformidad}`,
          tipo: 'conformidad',
          titulo: 'Conformidad aprobada',
          descripcion: 'La administración aprobó la conformidad — incidente finalizado',
          fecha: conf.fecha_conformidad,
          icono: <CheckCircle className="h-4 w-4" />,
          color: 'bg-emerald-500',
        })
      }
    })

    // Evento de cierre si existe
    if (incidenteData.fecha_cierre) {
      timelineEvents.push({
        id: 'cierre',
        tipo: 'estado',
        titulo: 'Incidente Finalizado',
        descripcion: incidenteData.fue_resuelto ? 'Resuelto satisfactoriamente' : 'Cerrado sin resolución completa',
        fecha: incidenteData.fecha_cierre,
        icono: <CheckCircle className="h-4 w-4" />,
        color: incidenteData.fue_resuelto ? 'bg-emerald-500' : 'bg-gray-500',
      })
    }

    // Guardar avances para mostrar en tab ejecucion del técnico
    setAvancesRegistrados(avances || [])

    // Normalizar todas las fechas a UTC antes de ordenar
    timelineEvents.forEach(e => { e.fecha = toUTC(e.fecha) as string })

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
        // Recargar datos del incidente para actualizar lista de avances y timeline
        if (incidente) await construirTimeline(incidente, asignaciones, rol)
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
    if (!incidenteId || !fotoFile || !comprobanteFile) return
    setUploadingFoto(true)
    try {
      const supabase = createClient()
      const ts = Date.now()

      // Subir foto de conformidad
      const extFoto = fotoFile.name.split('.').pop() || 'jpg'
      const pathFoto = `tecnico/${incidenteId}/${ts}_conformidad.${extFoto}`
      const { data: uploadFoto, error: errFoto } = await supabase.storage
        .from('conformidades')
        .upload(pathFoto, fotoFile, { upsert: false })
      if (errFoto) { toast.error('Error al subir la foto: ' + errFoto.message); return }
      const { data: { publicUrl: fotoUrl } } = supabase.storage.from('conformidades').getPublicUrl(uploadFoto.path)

      // Subir comprobante de compras
      const extComp = comprobanteFile.name.split('.').pop() || 'jpg'
      const pathComp = `tecnico/${incidenteId}/${ts}_comprobante.${extComp}`
      const { data: uploadComp, error: errComp } = await supabase.storage
        .from('conformidades')
        .upload(pathComp, comprobanteFile, { upsert: false })
      if (errComp) { toast.error('Error al subir el comprobante: ' + errComp.message); return }
      const { data: { publicUrl: comprobanteUrl } } = supabase.storage.from('conformidades').getPublicUrl(uploadComp.path)

      const res = await crearConformidadPorTecnico(incidenteId, fotoUrl, comprobanteUrl)
      if (res.success) {
        toast.success('Conformidad enviada', { description: 'La administración revisará la foto y te notificará.' })
        setFotoFile(null)
        setFotoPreview(null)
        setComprobanteFile(null)
        setComprobantePreview(null)
        await cargarIncidente()
        onUpdate?.()
      } else {
        toast.error(res.error ?? 'Error al enviar conformidad')
      }
    } catch {
      toast.error('Error inesperado al subir los archivos')
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

  const handleAprobarPresupuesto = async (idPresupuesto: number) => {
    setSavingPresupuestoAdmin(true)
    try {
      const gastos = parseFloat(gastosAdmin) || 0
      const res = await aprobarPresupuesto(idPresupuesto, gastos)
      if (res.success) {
        toast.success('Presupuesto aprobado — el cliente recibirá notificación')
        setGastosAdmin('')
        await cargarIncidente()
        onUpdate?.()
      } else {
        toast.error(res.error ?? 'Error al aprobar presupuesto')
      }
    } finally {
      setSavingPresupuestoAdmin(false)
    }
  }

  const handleRechazarPresupuesto = async (idPresupuesto: number) => {
    setSavingPresupuestoAdmin(true)
    try {
      const res = await rechazarPresupuesto(idPresupuesto)
      if (res.success) {
        toast.success('Presupuesto rechazado — el incidente volvió a Pendiente')
        await cargarIncidente()
        onUpdate?.()
      } else {
        toast.error(res.error ?? 'Error al rechazar presupuesto')
      }
    } finally {
      setSavingPresupuestoAdmin(false)
    }
  }

  const handleResponderOportunidad = async (idPresupuesto: number, aceptar: boolean) => {
    setSavingOportunidad(true)
    try {
      const res = await responderOportunidadTecnico(idPresupuesto, aceptar)
      if (res.success) {
        toast.success(aceptar ? 'Aceptaste hacer un nuevo presupuesto' : 'Respondiste al cliente')
        await cargarIncidente()
        onUpdate?.()
      } else {
        toast.error(res.error ?? 'Error al responder')
      }
    } finally {
      setSavingOportunidad(false)
    }
  }

  const handleAprobarConformidad = async (idConformidad: number) => {
    if (puntuacionAdmin < 1 || puntuacionAdmin > 5) {
      toast.error('La calificación debe ser entre 1 y 5')
      return
    }
    setSavingConformidadAdmin(true)
    try {
      const res = await aprobarConformidad(idConformidad, puntuacionAdmin, comentariosAdmin || null, resolvioProbAdmin)
      if (res.success) {
        toast.success('Conformidad aprobada — incidente finalizado')
        setComentariosAdmin('')
        setPuntuacionAdmin(5)
        setResolvioProbAdmin(true)
        await cargarIncidente()
        onUpdate?.()
      } else {
        toast.error(res.error ?? 'Error al aprobar conformidad')
      }
    } finally {
      setSavingConformidadAdmin(false)
    }
  }

  const handleRechazarConformidad = async (idConformidad: number) => {
    setSavingConformidadAdmin(true)
    try {
      const res = await rechazarConformidad(idConformidad)
      if (res.success) {
        toast.success('Conformidad rechazada — el técnico debe resubir')
        await cargarIncidente()
        onUpdate?.()
      } else {
        toast.error(res.error ?? 'Error al rechazar conformidad')
      }
    } finally {
      setSavingConformidadAdmin(false)
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
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
            Incidente #{incidenteId}
            {rol === 'admin' && onDarBaja && !loading && incidente && (
              (() => {
                const tieneAsignacionActiva = asignaciones.some(a =>
                  ['pendiente', 'aceptada', 'en_curso', 'completada'].includes(a.estado_asignacion)
                )
                const tieneConformidadSubida = !!conformidad?.url_documento
                if (!tieneAsignacionActiva || tieneConformidadSubida) return null
                return (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-auto mr-8 gap-1.5 shrink-0"
                    onClick={() => { onOpenChange(false); onDarBaja(incidenteId!) }}
                  >
                    <UserX className="h-4 w-4" />
                    Dar de baja
                  </Button>
                )
              })()
            )}
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
          const hasCalificacion = rol === 'cliente' && (incidente.estado_actual === EstadoIncidente.RESUELTO || incidente.estado_actual === 'finalizado')
          const hasPagosTab = rol === 'cliente' && (incidente.estado_actual === 'resuelto' || incidente.estado_actual === 'finalizado')
          const hasPagosTecnicoTab = rol === 'tecnico' && conformidad?.url_documento
          const hasAdminStepperTabs = rol === 'admin' && asignaciones.some(a =>
            ['aceptada', 'en_curso', 'completada'].includes(a.estado_asignacion)
          )
          // ── Stepper steps computation ─────────────────────────────────────
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

          // ── Presupuestos adicionales ──────────────────────────────────────
          const presOrdenados = [...presupuestos].sort((a, b) =>
            new Date(a.fecha_creacion ?? '').getTime() - new Date(b.fecha_creacion ?? '').getTime()
          )
          const primerPresAprobado = presOrdenados.find(p => p.estado_presupuesto === EstadoPresupuesto.APROBADO)
          const presupuestosAdicionales = primerPresAprobado
            ? presOrdenados.filter(p =>
                p.id_presupuesto !== primerPresAprobado.id_presupuesto &&
                new Date(p.fecha_creacion ?? '') > new Date(primerPresAprobado.fecha_creacion ?? '')
              )
            : []
          const hayAdicionalRechazado = presupuestosAdicionales.some(p => p.estado_presupuesto === EstadoPresupuesto.RECHAZADO)
          const hayAdicionalPendiente = presupuestosAdicionales.some(p =>
            [EstadoPresupuesto.ENVIADO, EstadoPresupuesto.APROBADO_ADMIN].includes(p.estado_presupuesto as EstadoPresupuesto)
          )
          const puedeAgregarAdicional = !!primerPresAprobado && !trabajoCompletado && !hayAdicionalRechazado && !hayAdicionalPendiente

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

          const conformidadAprobada = conformidad && (conformidad.esta_firmada === 1 || conformidad.esta_firmada === true)
          // Stepper admin: 2 pasos — Presupuesto y Conformidad
          const computeAdminSteps = (): StepDef[] => {
            const sa1: StepStatus = presupuestoAprobadoAdmin ? 'completed' : tienePresupuesto ? 'active' : 'locked'
            const sa2: StepStatus = conformidadAprobada ? 'completed' : (tieneConformidad || trabajoCompletado) ? 'active' : 'locked'
            return [
              { id: 1, label: 'Presupuesto', sublabel: presupuestoAprobadoAdmin ? 'Aprobado' : tienePresupuesto ? 'Para aprobar' : 'Sin envío',                          tab: 'presupuesto_admin', status: sa1 },
              { id: 2, label: 'Conformidad', sublabel: conformidadAprobada ? 'Aprobada' : tieneConformidad ? 'Para revisar' : trabajoCompletado ? 'Pendiente' : 'Bloqueada', tab: 'conformidad_admin', status: sa2 },
            ]
          }
          const adminSteps = computeAdminSteps()

          return (
          <div className="w-full">

            {/* Stepper admin — solo en área de gestión, sin pills de navegación */}
            {hasAdminStepperTabs && ['presupuesto_admin', 'conformidad_admin'].includes(activeTab) && !hideTabs && (
              <div className="mb-4 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <StepperTecnico steps={adminSteps} activeTab={activeTab} onStepClick={setActiveTab} />
              </div>
            )}

            {/* Stepper técnico — siempre visible en su área de trabajo */}
            {hasTecnicoTabs && !hideTabs && (
              <div className="mb-4 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <StepperTecnico steps={steps} activeTab={activeTab} onStepClick={setActiveTab} />
                {hasPagosTecnicoTab && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex">
                    <button
                      onClick={() => setActiveTab('pagos')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        activeTab === 'pagos' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      Pagos
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Nav pills para cliente */}
            {rol === 'cliente' && !hideTabs && (
              <div className="flex gap-1 mb-4 flex-wrap bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'detalles', label: 'Detalles' },
                  { id: 'timeline', label: 'Timeline' },
                  ...(hasClientePresupuesto ? [{ id: 'presupuesto', label: 'Presupuesto' }] : []),
                  ...(hasPagosTab ? [{ id: 'pagos', label: 'Pagos' }] : []),
                  ...(hasCalificacion ? [{ id: 'calificacion', label: 'Calificar' }] : []),
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Content area: key=activeTab garantiza que solo un tab se renderiza ── */}
            <div key={activeTab}>

            {/* Tab Detalles */}
            {activeTab === 'detalles' && (<div className="space-y-4 mt-4">
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

              {/* Foto del incidente */}
              {incidente.url_foto_diagnostico && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Foto del incidente
                  </h4>
                  <a
                    href={incidente.url_foto_diagnostico}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={incidente.url_foto_diagnostico}
                      alt="Foto del incidente"
                      className="w-full max-h-64 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity cursor-zoom-in"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">Tocá para ver en tamaño completo</p>
                  </a>
                </div>
              )}

              {/* Disponibilidad — lista de franjas */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Disponibilidad para la visita
                </h4>
                {franjas.length > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 space-y-1">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Franjas disponibles del cliente
                    </p>
                    {franjas.map((f, i) => (
                      <p key={i} className="text-xs text-amber-800">
                        <span className="font-medium capitalize">
                          {new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}:
                        </span>{' '}
                        {f.hora_inicio}–{f.hora_fin}
                      </p>
                    ))}
                  </div>
                ) : incidente.disponibilidad ? (
                  <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 italic">
                    {incidente.disponibilidad}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Sin disponibilidad registrada</p>
                )}
              </div>

              {/* Panel confirmación de visita — solo para cliente con visita activa */}
              {rol === 'cliente' && visitaActiva && (
                <ConfirmarVisitaPanel
                  visita={visitaActiva}
                  onCambio={() => cargarIncidente()}
                />
              )}

              {/* Disponibilidad para visita de obra — cliente ingresa nueva disponibilidad cuando presupuesto aprobado */}
              {rol === 'cliente' && (() => {
                const presAprobado = presupuestos.some(p => p.estado_presupuesto === EstadoPresupuesto.APROBADO)
                const estaCompletado = asignaciones.some(a => a.estado_asignacion === 'completada')
                if (!presAprobado || estaCompletado) return null
                return (
                  <DisponibilidadReparacionPanel
                    idIncidente={incidente.id_incidente}
                    franjasActuales={franjasReparacion}
                    onGuardar={() => cargarIncidente()}
                  />
                )
              })()}

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
            </div>)}

            {/* Tab Timeline */}
            {activeTab === 'timeline' && (<div className="mt-4">
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
                        const hasDetail = (event.detalleItems && event.detalleItems.length > 0) || !!event.metadata
                        const fmtFecha = event.fecha ? (() => { try { return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(event.fecha)) } catch { return '' } })() : ''
                        return (
                          <div key={event.id} className="relative flex gap-3">
                            <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${event.color} text-white`}>
                              {event.icono}
                            </div>
                            <div className="flex-1 pb-2 min-w-0">
                              <button
                                onClick={() => hasDetail && setExpandedEventId(isExpanded ? null : event.id)}
                                className={`w-full text-left ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-semibold leading-snug">{event.titulo}</p>
                                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                    <span className="text-[11px] text-gray-400 tabular-nums">{fmtFecha}</span>
                                    {hasDetail && (
                                      <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{event.descripcion}</p>
                              </button>

                              {isExpanded && hasDetail && (() => {
                                // ── Presupuesto ──────────────────────────────
                                if (event.tipo === 'presupuesto' && event.metadata) {
                                  const m = event.metadata
                                  return (
                                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
                                      <div className="px-3 py-2 bg-amber-100/60 border-b border-amber-200">
                                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Detalle del presupuesto</p>
                                      </div>
                                      <div className="p-3 space-y-3">
                                        {m.descripcion_detallada && (
                                          <p className="text-xs text-amber-900 leading-relaxed">{m.descripcion_detallada}</p>
                                        )}
                                        {(m.costo_materiales != null || m.costo_mano_obra != null || m.costo_total != null) && (
                                          <div className="grid grid-cols-3 gap-2">
                                            {m.costo_materiales != null && (
                                              <div className="bg-white/70 rounded-lg p-2 text-center">
                                                <p className="text-[10px] text-amber-600 font-semibold">Materiales</p>
                                                <p className="text-xs font-bold text-amber-800">${m.costo_materiales.toLocaleString()}</p>
                                              </div>
                                            )}
                                            {m.costo_mano_obra != null && (
                                              <div className="bg-white/70 rounded-lg p-2 text-center">
                                                <p className="text-[10px] text-amber-600 font-semibold">Mano de obra</p>
                                                <p className="text-xs font-bold text-amber-800">${m.costo_mano_obra.toLocaleString()}</p>
                                              </div>
                                            )}
                                            {m.costo_total != null && (
                                              <div className="bg-amber-200/60 rounded-lg p-2 text-center">
                                                <p className="text-[10px] text-amber-700 font-bold">Total</p>
                                                <p className="text-sm font-black text-amber-900">${m.costo_total.toLocaleString()}</p>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {m.alternativas && (
                                          <div>
                                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Alternativas</p>
                                            <p className="text-xs text-amber-800">{m.alternativas}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                }

                                // ── Conformidad ──────────────────────────────
                                if (event.tipo === 'conformidad' && event.metadata) {
                                  const m = event.metadata
                                  const isImg = (url: string) => /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(url)
                                  return (
                                    <div className="mt-2 rounded-xl border border-purple-200 bg-purple-50 overflow-hidden">
                                      <div className="px-3 py-2 bg-purple-100/60 border-b border-purple-200">
                                        <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Documentos adjuntos</p>
                                      </div>
                                      <div className="p-3 space-y-3">
                                        {m.url_documento && (
                                          <div className="space-y-1.5">
                                            <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Foto de conformidad</p>
                                            {isImg(m.url_documento) ? (
                                              <a href={m.url_documento} target="_blank" rel="noopener noreferrer" className="block">
                                                <img src={m.url_documento} alt="Conformidad" className="w-full max-h-52 object-contain rounded-lg border border-purple-200 bg-white" />
                                                <p className="text-[10px] text-purple-500 text-center mt-1">Tocá para ver en tamaño completo</p>
                                              </a>
                                            ) : (
                                              <a href={m.url_documento} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-purple-700 bg-white border border-purple-200 rounded-lg px-3 py-2 hover:bg-purple-100 transition-colors">
                                                <FileText className="h-4 w-4 shrink-0" />
                                                <span className="font-medium">Ver documento de conformidad</span>
                                              </a>
                                            )}
                                          </div>
                                        )}
                                        {m.url_comprobante_compras && (
                                          <div className="space-y-1.5">
                                            <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Comprobante de materiales</p>
                                            {isImg(m.url_comprobante_compras) ? (
                                              <a href={m.url_comprobante_compras} target="_blank" rel="noopener noreferrer" className="block">
                                                <img src={m.url_comprobante_compras} alt="Comprobante" className="w-full max-h-40 object-contain rounded-lg border border-purple-200 bg-white" />
                                                <p className="text-[10px] text-purple-500 text-center mt-1">Tocá para ver en tamaño completo</p>
                                              </a>
                                            ) : (
                                              <a href={m.url_comprobante_compras} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-purple-700 bg-white border border-purple-200 rounded-lg px-3 py-2 hover:bg-purple-100 transition-colors">
                                                <FileText className="h-4 w-4 shrink-0" />
                                                <span className="font-medium">Ver comprobante de compras</span>
                                              </a>
                                            )}
                                          </div>
                                        )}
                                        {m.observaciones && (
                                          <div>
                                            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide mb-1">Observaciones</p>
                                            <p className="text-xs text-purple-800">{m.observaciones}</p>
                                          </div>
                                        )}
                                        {!m.url_documento && !m.url_comprobante_compras && !m.observaciones && (
                                          <p className="text-xs text-purple-400 text-center py-2">Sin documentos adjuntos</p>
                                        )}
                                      </div>
                                    </div>
                                  )
                                }

                                // ── Pago ─────────────────────────────────────
                                if (event.tipo === 'pago' && event.metadata) {
                                  const m = event.metadata
                                  const METODO_LABELS: Record<string, string> = {
                                    efectivo: 'Efectivo', transferencia: 'Transferencia',
                                    debito: 'Débito', credito: 'Crédito',
                                  }
                                  return (
                                    <div className="mt-2 rounded-xl border border-green-200 bg-green-50 overflow-hidden">
                                      <div className="px-3 py-2 bg-green-100/60 border-b border-green-200">
                                        <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Detalle del pago</p>
                                      </div>
                                      <div className="p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <p className="text-xs text-green-600">Monto</p>
                                          <p className="text-xl font-black text-green-800">${(m.monto ?? 0).toLocaleString()}</p>
                                        </div>
                                        {m.metodo_pago && (
                                          <div className="flex items-center justify-between">
                                            <p className="text-xs text-green-600">Método</p>
                                            <span className="text-xs font-semibold bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                              {METODO_LABELS[m.metodo_pago] ?? m.metodo_pago}
                                            </span>
                                          </div>
                                        )}
                                        {m.referencia_pago && (
                                          <div className="flex items-start justify-between gap-4">
                                            <p className="text-xs text-green-600 shrink-0">Referencia</p>
                                            <p className="text-xs font-mono text-green-800 break-all text-right">{m.referencia_pago}</p>
                                          </div>
                                        )}
                                        {m.observaciones && (
                                          <div>
                                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-1">Observaciones</p>
                                            <p className="text-xs text-green-800">{m.observaciones}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                }

                                // ── Fallback: detalleItems grid ───────────────
                                if (event.detalleItems?.length) {
                                  return (
                                    <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-1.5">
                                      {event.detalleItems.map((item, i) => (
                                        <div key={i} className="grid grid-cols-[110px_1fr] gap-2 text-xs">
                                          <span className="font-semibold text-gray-500">{item.label}</span>
                                          <span className="text-gray-800">{item.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                }
                                return null
                              })()}
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
            </div>)}

            {/* Tab Gestión legacy — eliminado, ahora el stepper admin maneja esto */}
            {false && rol === 'admin' && (
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
                          {categoriasDisponibles.map((cat) => (
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
                          {tecnicos.map((tecnico) => {
                            const f = fiabilidad[tecnico.id_tecnico]
                            const rechazos = f?.rechazadas ?? 0
                            const cancelaciones = f?.canceladas ?? 0
                            const total = f?.totalAsignaciones ?? 0
                            const stats = total > 0
                              ? [
                                  rechazos > 0 ? `${rechazos} rechazó` : null,
                                  cancelaciones > 0 ? `${cancelaciones} canceló` : null,
                                ].filter(Boolean).join(' · ')
                              : null
                            return (
                              <SelectItem key={tecnico.id_tecnico} value={tecnico.id_tecnico.toString()}>
                                <div className="flex flex-col">
                                  <span>{tecnico.nombre} {tecnico.apellido} {tecnico.especialidad && `(${tecnico.especialidad})`}</span>
                                  {stats ? (
                                    <span className="text-[10px] text-amber-600">{stats} de {total} asignaciones</span>
                                  ) : total > 0 ? (
                                    <span className="text-[10px] text-emerald-600">Sin rechazos ni cancelaciones</span>
                                  ) : null}
                                </div>
                              </SelectItem>
                            )
                          })}
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
                                Asignado: {asig.fecha_asignacion ? format(new Date(asig.fecha_asignacion), "dd/MM/yy HH:mm", { locale: es }) : ''}
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
            {hasTecnicoTabs && incidente && activeTab === 'inspecciones' && (
              <div className="mt-4">
                {/* Panel de visitas — solo si el cliente tiene disponibilidad y aún no hay inspección */}
                {franjas.length > 0 && !tieneInspeccion && (() => {
                  const asigActiva = asignaciones.find(a => ['aceptada', 'en_curso'].includes(a.estado_asignacion)) as any
                  return asigActiva ? (
                    <PropVisitaSection
                      idIncidente={incidente.id_incidente}
                      idTecnico={asigActiva.id_tecnico}
                      franjas={franjas}
                      initialVisita={visitaActiva}
                      onCambio={() => cargarIncidente()}
                      onIrAInspeccion={() => {}}
                    />
                  ) : null
                })()}
                <InspeccionesList
                  incidenteId={incidente.id_incidente}
                  idTecnico={asignaciones.find(a => a.estado_asignacion !== 'rechazada')?.id_tecnico || 0}
                  inspecciones={inspeccionesActivas}
                  puedeCrearNueva={presupuestos.some(p => p.estado_presupuesto === EstadoPresupuesto.RECHAZADO) && !conformidad?.url_documento}
                  onInspeccionCreated={() => cargarIncidente()}
                  onInspeccionDeleted={() => cargarIncidente()}
                />
              </div>
            )}

            {/* Tab Presupuesto (para técnicos con asignación confirmada) */}
            {hasTecnicoTabs && incidente && activeTab === 'presupuesto' && (
              <div className="mt-4 space-y-4">
                {(() => {
                  const tienePresupuestoActivo = presupuestosActivos.length > 0
                  // Presupuesto rechazado donde el cliente dio otra oportunidad y el técnico aún no respondió
                  const presOportunidadPendiente = presupuestos.find(p =>
                    p.estado_presupuesto === EstadoPresupuesto.RECHAZADO &&
                    (p as any).decision_cliente === 'otra_oportunidad' &&
                    !(p as any).decision_tecnico
                  )
                  // El técnico aceptó rehacer → mostrar formulario directamente
                  const presOportunidadAceptada = presupuestos.find(p =>
                    p.estado_presupuesto === EstadoPresupuesto.RECHAZADO &&
                    (p as any).decision_cliente === 'otra_oportunidad' &&
                    (p as any).decision_tecnico === 'acepta'
                  )
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
                              Creado: {pres.fecha_creacion ? format(new Date(pres.fecha_creacion), "dd/MM/yy HH:mm", { locale: es }) : ''}
                            </p>
                          )}
                        </div>
                      )
                          })}
                        </div>
                      )}

                      {/* Tarjeta de decisión: cliente rechazó y da otra oportunidad */}
                      {!tienePresupuestoActivo && presOportunidadPendiente && (
                        <div className="rounded-xl border-2 border-orange-300 bg-orange-50 overflow-hidden">
                          <div className="bg-orange-500 px-4 py-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-white flex-shrink-0" />
                            <p className="text-white font-bold text-sm">El cliente rechazó tu presupuesto</p>
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="rounded-lg bg-white border border-orange-200 p-3 space-y-1.5">
                              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Presupuesto #{(presOportunidadPendiente as any).id_presupuesto}</p>
                              <p className="text-sm text-gray-700">{(presOportunidadPendiente as any).descripcion_detallada}</p>
                              <div className="flex gap-4 pt-1">
                                {(presOportunidadPendiente as any).costo_materiales != null && (
                                  <div>
                                    <p className="text-xs text-gray-400">Materiales</p>
                                    <p className="text-xs font-semibold">${((presOportunidadPendiente as any).costo_materiales ?? 0).toLocaleString()}</p>
                                  </div>
                                )}
                                {(presOportunidadPendiente as any).costo_mano_obra != null && (
                                  <div>
                                    <p className="text-xs text-gray-400">Mano de obra</p>
                                    <p className="text-xs font-semibold">${((presOportunidadPendiente as any).costo_mano_obra ?? 0).toLocaleString()}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs text-gray-400">Total</p>
                                  <p className="text-xs font-bold">${((presOportunidadPendiente as any).costo_total ?? 0).toLocaleString()}</p>
                                </div>
                              </div>
                            </div>

                            {(presOportunidadPendiente as any).nota_rechazo_cliente && (
                              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                                <p className="text-xs font-semibold text-amber-700 mb-1">Comentarios del cliente:</p>
                                <p className="text-sm text-amber-900 italic">&ldquo;{(presOportunidadPendiente as any).nota_rechazo_cliente}&rdquo;</p>
                              </div>
                            )}

                            <p className="text-sm font-semibold text-gray-700">¿Podés enviar un nuevo presupuesto?</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                onClick={() => handleResponderOportunidad((presOportunidadPendiente as any).id_presupuesto, true)}
                                disabled={savingOportunidad}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 gap-1.5 text-xs"
                              >
                                {savingOportunidad ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                Sí, acepto
                              </Button>
                              <Button
                                onClick={() => handleResponderOportunidad((presOportunidadPendiente as any).id_presupuesto, false)}
                                disabled={savingOportunidad}
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5 text-xs"
                              >
                                {savingOportunidad ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                No puedo
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Formulario de presupuesto: sin activo y sin oportunidad pendiente de respuesta */}
                      {!tienePresupuestoActivo && !presOportunidadPendiente && (inspeccionesActivas.length === 0 ? (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold mb-1">Inspección requerida</p>
                            <p>Debés cargar al menos una inspección antes de poder crear un presupuesto. Andá al tab Inspecciones para registrarla.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {presOportunidadAceptada && (
                            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800 flex items-start gap-2">
                              <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <p>Aceptaste enviar un nuevo presupuesto. Completá el formulario a continuación.</p>
                            </div>
                          )}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {presOportunidadAceptada ? 'Nuevo Presupuesto' : 'Nuevo Presupuesto'}
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
                      {inspeccionesActivas[0] && (() => {
                        const insp = inspeccionesActivas[0]
                        return (
                          <div className="space-y-2">
                            <Label>Inspección vinculada <span className="text-red-500">*</span></Label>
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-700">Inspección #{insp.id_inspeccion}</span>
                                {insp.fecha_inspeccion && (
                                  <span className="text-xs text-blue-500">{format(new Date(insp.fecha_inspeccion), "dd/MM/yy", { locale: es })}</span>
                                )}
                              </div>
                              {insp.descripcion_inspeccion && (
                                <p className="text-xs text-blue-900">{insp.descripcion_inspeccion}</p>
                              )}
                              {(insp.causas_determinadas || insp.danos_ocasionados) && (
                                <div className="grid grid-cols-2 gap-2">
                                  {insp.causas_determinadas && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Causas</p>
                                      <p className="text-xs text-blue-800">{insp.causas_determinadas}</p>
                                    </div>
                                  )}
                                  {insp.danos_ocasionados && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Daños</p>
                                      <p className="text-xs text-blue-800">{insp.danos_ocasionados}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-3 pt-0.5">
                                {insp.dias_estimados_trabajo != null && (
                                  <span className="text-xs text-blue-700">⏱ {insp.dias_estimados_trabajo} día{insp.dias_estimados_trabajo !== 1 ? 's' : ''} est.</span>
                                )}
                                {insp.requiere_materiales === 1 && (
                                  <span className="text-xs text-blue-700">🔧 Requiere materiales</span>
                                )}
                                {insp.requiere_ayudantes === 1 && insp.cantidad_ayudantes != null && (
                                  <span className="text-xs text-blue-700">👷 {insp.cantidad_ayudantes} ayudante{insp.cantidad_ayudantes !== 1 ? 's' : ''}</span>
                                )}
                              </div>
                              {insp.descripcion_materiales && (
                                <div>
                                  <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Materiales necesarios</p>
                                  <p className="text-xs text-blue-800">{insp.descripcion_materiales}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
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
              </div>
            )}

            {/* Tab Ejecución (para técnicos con presupuesto aprobado) */}
            {hasTecnicoTabs && incidente && activeTab === 'ejecucion' && (
              <div className="mt-4 space-y-5">
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
                        {/* Coordinación de visita de reparación */}
                        {(() => {
                          const asigActiva = asignaciones.find(a =>
                            ['aceptada', 'en_curso'].includes(a.estado_asignacion)
                          ) as any
                          if (!asigActiva) return null
                          if (franjasReparacion.length === 0) {
                            return (
                              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                                <CalendarDays className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-semibold text-amber-800">Esperando disponibilidad del cliente</p>
                                  <p className="text-xs text-amber-700 mt-0.5">
                                    El cliente debe indicar en qué días puede recibir la visita de obra. Una vez que lo haga, podrás coordinar la fecha aquí.
                                  </p>
                                </div>
                              </div>
                            )
                          }
                          return (
                            <PropVisitaSection
                              idIncidente={incidente.id_incidente}
                              idTecnico={asigActiva.id_tecnico}
                              franjas={franjasReparacion}
                              initialVisita={visitaReparacionActiva}
                              tipoForzado="reparacion"
                              onCambio={() => cargarIncidente()}
                            />
                          )
                        })()}

                        {/* Presupuestos adicionales */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-gray-600 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Presupuestos adicionales
                          </h4>

                          {/* Lista de adicionales enviados */}
                          {presupuestosAdicionales.length > 0 && (
                            <div className="space-y-2">
                              {presupuestosAdicionales.map((p) => {
                                const colorMap: Record<string, string> = {
                                  enviado: 'bg-blue-50 border-blue-200 text-blue-800',
                                  aprobado_admin: 'bg-indigo-50 border-indigo-200 text-indigo-800',
                                  aprobado: 'bg-green-50 border-green-200 text-green-800',
                                  rechazado: 'bg-red-50 border-red-200 text-red-800',
                                }
                                const labelMap: Record<string, string> = {
                                  enviado: 'Enviado — esperando revisión admin',
                                  aprobado_admin: 'Aprobado por admin — esperando cliente',
                                  aprobado: 'Aprobado',
                                  rechazado: 'Rechazado',
                                }
                                const color = colorMap[p.estado_presupuesto ?? ''] ?? 'bg-gray-50 border-gray-200 text-gray-700'
                                const label = labelMap[p.estado_presupuesto ?? ''] ?? p.estado_presupuesto
                                return (
                                  <div key={p.id_presupuesto} className={`rounded-lg border p-3 text-xs ${color}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-semibold">Presupuesto adicional #{p.id_presupuesto}</span>
                                      <span className="font-medium">{label}</span>
                                    </div>
                                    <p className="text-xs opacity-80 truncate">{p.descripcion_detallada}</p>
                                    {p.costo_total != null && (
                                      <p className="font-semibold mt-1">Total: ${Number(p.costo_total).toLocaleString('es-AR')}</p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Alerta si fue rechazado */}
                          {hayAdicionalRechazado && (
                            <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-red-800 font-medium">
                                Tu presupuesto adicional fue rechazado. Debés terminar el trabajo con los recursos aprobados. El trabajo puede quedar incompleto.
                              </p>
                            </div>
                          )}

                          {/* Formulario para agregar nuevo adicional */}
                          {puedeAgregarAdicional && (
                            <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-3">
                              <p className="text-xs text-gray-500">Necesitás más recursos para completar el trabajo. Enviá un presupuesto adicional:</p>
                              <div className="space-y-2">
                                <Label className="text-xs">Descripción <span className="text-red-500">*</span></Label>
                                <Textarea
                                  value={presDescripcion}
                                  onChange={(e) => setPresDescripcion(e.target.value)}
                                  placeholder="Describí los materiales o trabajos adicionales necesarios..."
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Costo materiales ($)</Label>
                                  <Input type="number" min="0" step="0.01" value={presCostoMateriales}
                                    onChange={(e) => setPresCostoMateriales(e.target.value)} placeholder="0" className="text-sm h-8" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Mano de obra ($)</Label>
                                  <Input type="number" min="0" step="0.01" value={presCostoManoObra}
                                    onChange={(e) => setPresCostoManoObra(e.target.value)} placeholder="0" className="text-sm h-8" />
                                </div>
                              </div>
                              {(presCostoMateriales || presCostoManoObra) && (
                                <p className="text-xs text-gray-600 font-medium">
                                  Total: ${((parseFloat(presCostoMateriales) || 0) + (parseFloat(presCostoManoObra) || 0)).toLocaleString('es-AR')}
                                </p>
                              )}
                              <Button
                                onClick={handleCrearPresupuesto}
                                disabled={savingPresupuesto || !presDescripcion.trim()}
                                size="sm"
                                className="w-full gap-2"
                              >
                                {savingPresupuesto ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Enviando...</> : <><Send className="h-3.5 w-3.5" />Enviar presupuesto adicional</>}
                              </Button>
                            </div>
                          )}

                          {hayAdicionalPendiente && (
                            <p className="text-xs text-blue-600 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              Presupuesto adicional en revisión. Esperá la respuesta antes de enviar otro.
                            </p>
                          )}
                        </div>

                        <Separator />

                        {/* Lista de avances registrados */}
                        {avancesRegistrados.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-gray-600 flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              Avances registrados
                            </h4>
                            <div className="space-y-2">
                              {avancesRegistrados.map((av: any, i: number) => (
                                <div key={av.id_avance ?? i} className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-indigo-800">
                                      Avance #{i + 1}
                                      {av.porcentaje_completado != null && (
                                        <span className="ml-2 text-indigo-600">{av.porcentaje_completado}%</span>
                                      )}
                                    </span>
                                    <span className="text-gray-400 shrink-0">
                                      {av.fecha_avance ? (() => { try { return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(av.fecha_avance)) } catch { return '' } })() : ''}
                                    </span>
                                  </div>
                                  <p className="text-gray-700">{av.descripcion_avance}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Separator />

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
                          {hayAdicionalPendiente && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                              Hay un presupuesto adicional pendiente de aprobación. Esperá la respuesta antes de completar el trabajo.
                            </p>
                          )}
                          {!confirmandoCompletar ? (
                            <Button
                              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
                              onClick={() => setConfirmandoCompletar(true)}
                              disabled={hayAdicionalPendiente}
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
                                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
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
              </div>
            )}

            {/* Tab Conformidad (para técnicos con trabajo completado) */}
            {hasTecnicoTabs && incidente && activeTab === 'conformidad' && (
              <div className="mt-4 space-y-4">
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
                      <Label>Foto de la conformidad firmada por el cliente <span className="text-red-500">*</span></Label>
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {fotoPreview ? (
                          fotoFile?.type === 'application/pdf' ? (
                            <div className="flex flex-col items-center gap-2 text-purple-700">
                              <FileText className="h-10 w-10" />
                              <p className="text-sm font-medium">{fotoFile.name}</p>
                            </div>
                          ) : (
                            <img src={fotoPreview} alt="Preview" className="max-h-48 mx-auto rounded-md object-contain" />
                          )
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-gray-500">
                            <ImageIcon className="h-10 w-10 text-gray-400" />
                            <p className="text-sm font-medium">Tocá para seleccionar una foto o PDF</p>
                            <p className="text-xs text-gray-400">JPG, PNG, HEIC, PDF — máx. 10 MB</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleFotoChange}
                      />
                      {fotoFile && (
                        <p className="text-xs text-gray-500">{fotoFile.name} ({(fotoFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Comprobante de compras de materiales <span className="text-red-500">*</span></Label>
                      <p className="text-xs text-gray-500">Subí la foto o foto del ticket/factura de los materiales comprados.</p>
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors"
                        onClick={() => comprobanteInputRef.current?.click()}
                      >
                        {comprobantePreview ? (
                          comprobanteFile?.type === 'application/pdf' ? (
                            <div className="flex flex-col items-center gap-2 text-amber-700">
                              <FileText className="h-10 w-10" />
                              <p className="text-sm font-medium">{comprobanteFile.name}</p>
                            </div>
                          ) : (
                            <img src={comprobantePreview} alt="Comprobante" className="max-h-48 mx-auto rounded-md object-contain" />
                          )
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-gray-500">
                            <ImageIcon className="h-10 w-10 text-amber-400" />
                            <p className="text-sm font-medium">Tocá para seleccionar el comprobante</p>
                            <p className="text-xs text-gray-400">JPG, PNG, HEIC, PDF — máx. 10 MB</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={comprobanteInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setComprobanteFile(file)
                          const reader = new FileReader()
                          reader.onload = (ev) => setComprobantePreview(ev.target?.result as string)
                          reader.readAsDataURL(file)
                        }}
                      />
                      {comprobanteFile && (
                        <p className="text-xs text-gray-500">{comprobanteFile.name} ({(comprobanteFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                      )}
                    </div>

                    <Button
                      onClick={handleSubirConformidad}
                      disabled={uploadingFoto || !fotoFile || !comprobanteFile}
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
              </div>
            )}

            {/* Tab Presupuesto Admin — revisar y aprobar/rechazar */}
            {rol === 'admin' && activeTab === 'presupuesto_admin' && (
              <div className="mt-4 space-y-4">
                {presupuestosActivos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No hay presupuesto enviado aún</p>
                    <p className="text-xs mt-1">El técnico debe enviarlo desde su portal</p>
                  </div>
                ) : (
                  presupuestosActivos.map(pres => (
                    <div key={pres.id_presupuesto} className="space-y-4">
                      {/* Detalle del presupuesto */}
                      <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-700">Presupuesto #{pres.id_presupuesto}</span>
                          <Badge variant="outline" className="text-xs">{pres.estado_presupuesto}</Badge>
                        </div>
                        {pres.descripcion_detallada && (
                          <p className="text-sm text-gray-700">{pres.descripcion_detallada}</p>
                        )}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {pres.costo_materiales != null && (
                            <div className="bg-white rounded p-2 border">
                              <p className="text-[10px] text-gray-500">Materiales</p>
                              <p className="text-sm font-semibold">${(pres.costo_materiales ?? 0).toLocaleString()}</p>
                            </div>
                          )}
                          {pres.costo_mano_obra != null && (
                            <div className="bg-white rounded p-2 border">
                              <p className="text-[10px] text-gray-500">Mano de obra</p>
                              <p className="text-sm font-semibold">${(pres.costo_mano_obra ?? 0).toLocaleString()}</p>
                            </div>
                          )}
                          <div className="bg-white rounded p-2 border">
                            <p className="text-[10px] text-gray-500">Total técnico</p>
                            <p className="text-sm font-bold">${(pres.costo_total ?? 0).toLocaleString()}</p>
                          </div>
                        </div>
                        {pres.alternativas_reparacion && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Alternativas</p>
                            <p className="text-xs text-gray-600">{pres.alternativas_reparacion}</p>
                          </div>
                        )}
                      </div>

                      {/* Aprobar / Rechazar — solo cuando enviado */}
                      {pres.estado_presupuesto === 'enviado' && (
                        <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                          <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Revisión del presupuesto
                          </h4>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Gastos administrativos ($) — opcional</Label>
                            <Input
                              type="number"
                              min="0"
                              value={gastosAdmin}
                              onChange={(e) => setGastosAdmin(e.target.value)}
                              placeholder="0"
                              className="bg-white"
                            />
                            {(parseFloat(gastosAdmin) || 0) > 0 && (
                              <p className="text-xs text-blue-700 font-medium">
                                Total final al cliente: ${((pres.costo_materiales || 0) + (pres.costo_mano_obra || 0) + (parseFloat(gastosAdmin) || 0)).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() => handleRechazarPresupuesto(pres.id_presupuesto)}
                              disabled={savingPresupuestoAdmin}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
                              onClick={() => handleAprobarPresupuesto(pres.id_presupuesto)}
                              disabled={savingPresupuestoAdmin}
                            >
                              {savingPresupuestoAdmin
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <CheckCircle className="h-3.5 w-3.5" />
                              }
                              Aprobar
                            </Button>
                          </div>
                        </div>
                      )}

                      {['aprobado_admin', 'aprobado'].includes(pres.estado_presupuesto ?? '') && (
                        <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <p className="text-sm text-green-800">
                            {pres.estado_presupuesto === 'aprobado'
                              ? 'Aprobado por el cliente — trabajo en curso'
                              : 'Aprobado por administración — pendiente de aprobación del cliente'}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab Conformidad Admin — ver foto y aprobar/rechazar */}
            {rol === 'admin' && activeTab === 'conformidad_admin' && (
              <div className="mt-4 space-y-4">
                {!tieneConformidad ? (
                  <div className="text-center py-8 text-gray-400">
                    <ClipboardList className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No hay conformidad subida aún</p>
                    <p className="text-xs mt-1">El técnico debe completar el trabajo y subir la foto</p>
                  </div>
                ) : conformidad?.esta_rechazada ? (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">Conformidad rechazada — el técnico debe resubir la foto</p>
                  </div>
                ) : (conformidad?.esta_firmada === 1 || conformidad?.esta_firmada === true) ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-800">Conformidad aprobada — incidente finalizado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Advertencia si hubo presupuesto adicional rechazado */}
                    {hayAdicionalRechazado && (
                      <div className="rounded-lg bg-amber-50 border border-amber-300 p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800">
                          <p className="font-semibold mb-0.5">Presupuesto adicional rechazado</p>
                          <p>El técnico solicitó recursos adicionales que fueron rechazados. El trabajo puede estar incompleto ya que debió terminar con los recursos originalmente aprobados.</p>
                        </div>
                      </div>
                    )}

                    {/* Foto de conformidad */}
                    {conformidad?.url_documento && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5" />
                          Foto de conformidad subida por el técnico
                        </Label>
                        <a href={conformidad.url_documento} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={conformidad.url_documento}
                            alt="Conformidad"
                            className="w-full max-h-72 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-zoom-in hover:opacity-90 transition-opacity"
                          />
                        </a>
                      </div>
                    )}

                    {/* Calificación del técnico */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-500">Calificación del técnico</Label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setPuntuacionAdmin(n)}
                            className="p-0.5 transition-transform active:scale-90"
                          >
                            <CheckCircle
                              className={`h-7 w-7 transition-colors ${n <= puntuacionAdmin ? 'text-amber-400' : 'text-gray-200'}`}
                              fill={n <= puntuacionAdmin ? '#fbbf24' : 'none'}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-gray-500">{puntuacionAdmin}/5</span>
                      </div>
                    </div>

                    {/* Comentario */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-500">Comentario (opcional)</Label>
                      <Textarea
                        value={comentariosAdmin}
                        onChange={(e) => setComentariosAdmin(e.target.value)}
                        placeholder="Observaciones sobre el trabajo realizado..."
                        rows={2}
                      />
                    </div>

                    {/* Resolvió el problema */}
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={resolvioProbAdmin}
                        onChange={(e) => setResolvioProbAdmin(e.target.checked)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">El técnico resolvió el problema satisfactoriamente</span>
                    </label>

                    {/* Botones */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        className="flex-1 gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => handleRechazarConformidad(conformidad!.id_conformidad)}
                        disabled={savingConformidadAdmin}
                      >
                        <XCircle className="h-4 w-4" />
                        Rechazar
                      </Button>
                      <Button
                        className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
                        onClick={() => handleAprobarConformidad(conformidad!.id_conformidad)}
                        disabled={savingConformidadAdmin}
                      >
                        {savingConformidadAdmin
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <CheckCircle2 className="h-4 w-4" />
                        }
                        Aprobar y cerrar incidente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab Presupuesto (para clientes con presupuestos) */}
            {rol === 'cliente' && presupuestos.length > 0 && activeTab === 'presupuesto' && (
              <div className="mt-4">
                <PresupuestosClienteList
                  presupuestos={presupuestos as any}
                  onPresupuestoActualizado={() => cargarIncidente()}
                />
              </div>
            )}

            {/* Tab Pagos (para clientes con incidente resuelto/finalizado) */}
            {hasPagosTab && activeTab === 'pagos' && (
              <div className="mt-4 space-y-4">
                {cargandoPagos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : pagosIncidente ? (
                  <>
                    {/* Pago pendiente */}
                    {pagosIncidente.pendiente && (
                      <div className="rounded-xl border-2 border-orange-200 bg-orange-50 overflow-hidden">
                        <div className="bg-orange-500 px-4 py-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-white flex-shrink-0" />
                          <p className="text-white font-bold text-sm">Pago pendiente</p>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Monto a pagar</span>
                            <span className="text-2xl font-bold text-orange-600">
                              ${pagosIncidente.pendiente.monto_a_pagar.toLocaleString('es-AR')}
                            </span>
                          </div>
                          <div className="rounded-lg bg-white border border-orange-100 px-3 py-2.5 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-600">
                              La administración te contactará para coordinar la forma y fecha de pago.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Historial de pagos */}
                    {pagosIncidente.realizados.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Historial de pagos
                        </h4>
                        {pagosIncidente.realizados.map(r => (
                          <div key={r.id_cobro} className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Monto pagado</span>
                              <span className="text-xl font-bold text-green-600">
                                ${r.monto_cobro.toLocaleString('es-AR')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <span className="capitalize">{r.metodo_pago}</span>
                              {r.banco && <span className="text-gray-400">• {r.banco}</span>}
                              {r.cuotas && r.cuotas > 1 && <span className="text-gray-400">• {r.cuotas} cuotas</span>}
                            </div>
                            {r.referencia_pago && (
                              <p className="text-xs text-gray-500">Ref: <span className="font-mono">{r.referencia_pago}</span></p>
                            )}
                            {r.observaciones && (
                              <p className="text-xs text-gray-500 italic">{r.observaciones}</p>
                            )}
                            <p className="text-xs text-gray-400">
                              Pagado el {format(new Date(r.fecha_cobro), "d 'de' MMMM yyyy", { locale: es })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sin pagos */}
                    {!pagosIncidente.pendiente && pagosIncidente.realizados.length === 0 && (
                      <div className="text-center py-10">
                        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                          <DollarSign className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Sin pagos aún</p>
                        <p className="text-xs text-gray-400 mt-1">El cobro se generará una vez confirmado el servicio.</p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {/* Tab Pagos (para técnicos cuando subieron la conformidad) */}
            {hasPagosTecnicoTab && activeTab === 'pagos' && (
              <div className="mt-4 space-y-4">
                {cargandoPagos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : pagosTecnicoIncidente ? (
                  <>
                    {/* Pago pendiente de cobrar */}
                    {pagosTecnicoIncidente.pendiente && (
                      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 overflow-hidden">
                        <div className="bg-amber-500 px-4 py-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-white flex-shrink-0" />
                          <p className="text-white font-bold text-sm">Pago pendiente de recibir</p>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Monto a recibir</span>
                            <span className="text-2xl font-bold text-amber-600">
                              ${pagosTecnicoIncidente.pendiente.monto_a_recibir.toLocaleString('es-AR')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-white rounded-lg border border-amber-100 px-3 py-2">
                              <p className="text-xs text-gray-500">Materiales</p>
                              <p className="font-semibold">${pagosTecnicoIncidente.pendiente.costo_materiales.toLocaleString('es-AR')}</p>
                            </div>
                            <div className="bg-white rounded-lg border border-amber-100 px-3 py-2">
                              <p className="text-xs text-gray-500">Mano de obra</p>
                              <p className="font-semibold">${pagosTecnicoIncidente.pendiente.costo_mano_obra.toLocaleString('es-AR')}</p>
                            </div>
                          </div>
                          <div className="rounded-lg bg-white border border-amber-100 px-3 py-2.5 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-600">
                              La administración coordinará el pago una vez cerrado el incidente.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pagos recibidos */}
                    {pagosTecnicoIncidente.recibidos.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Pagos recibidos
                        </h4>
                        {pagosTecnicoIncidente.recibidos.map(r => (
                          <div key={r.id_pago_tecnico} className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Monto recibido</span>
                              <span className="text-xl font-bold text-green-600">
                                ${r.monto_pago.toLocaleString('es-AR')}
                              </span>
                            </div>
                            {r.metodo_pago && (
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span className="capitalize">{r.metodo_pago}</span>
                                {r.banco && <span className="text-gray-400">• {r.banco}</span>}
                                {r.cuotas && r.cuotas > 1 && <span className="text-gray-400">• {r.cuotas} cuotas</span>}
                              </div>
                            )}
                            {r.referencia_pago && (
                              <p className="text-xs text-gray-500">Ref: <span className="font-mono">{r.referencia_pago}</span></p>
                            )}
                            {r.observaciones && (
                              <p className="text-xs text-gray-500 italic">{r.observaciones}</p>
                            )}
                            <p className="text-xs text-gray-400">
                              Recibido el {format(new Date(r.fecha_pago), "d 'de' MMMM yyyy", { locale: es })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {!pagosTecnicoIncidente.pendiente && pagosTecnicoIncidente.recibidos.length === 0 && (
                      <div className="text-center py-10">
                        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                          <DollarSign className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Sin pagos aún</p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {/* Tab Calificación (para clientes cuando está resuelto) */}
            {rol === 'cliente' && incidente && (incidente.estado_actual === EstadoIncidente.RESUELTO || incidente.estado_actual === 'finalizado') && asignaciones.length > 0 && activeTab === 'calificacion' && (
              <div className="mt-4">
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
              </div>
            )}

            </div>{/* end key={activeTab} content area */}
          </div>
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
