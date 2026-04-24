'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Bell, CheckCheck, XCircle, CheckCircle2, Clock,
  AlertTriangle, Info, X, ExternalLink, Inbox, ChevronDown, Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/shared/lib/supabase/client'
import { marcarNotificacionLeida, marcarTodasLeidas } from '@/features/notificaciones/notificaciones-inapp.service'
import { TIPO_CATEGORIA } from '@/features/notificaciones/notificaciones.types'
import type { Notificacion, TipoNotificacionCategoria } from '@/features/notificaciones/notificaciones.types'

const MAX_GRUPOS = 5
const MAX_ITEMS = 8

// ─── Config visual por categoría ─────────────────────────────────────────────
const CATEGORIA_CONFIG: Record<TipoNotificacionCategoria, {
  icon: React.ElementType
  bg: string
  border: string
  iconColor: string
  titleColor: string
  msgColor: string
  dot: string
  badge: string
}> = {
  urgente: {
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-900',
    msgColor: 'text-red-700',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 border-red-200',
  },
  positivo: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-900',
    msgColor: 'text-emerald-700',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  pendiente: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    msgColor: 'text-amber-700',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  informativo: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    msgColor: 'text-blue-700',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
}

// Prioridad para determinar la categoría "más urgente" de un grupo
const CATEGORIA_PRIORIDAD: Record<TipoNotificacionCategoria, number> = {
  urgente: 3,
  pendiente: 2,
  positivo: 1,
  informativo: 0,
}

function getCategoriaConfig(tipo: string) {
  const cat = TIPO_CATEGORIA[tipo] ?? 'informativo'
  return CATEGORIA_CONFIG[cat]
}

function getCategoriaMaxGrupo(notifs: Notificacion[]): TipoNotificacionCategoria {
  let max: TipoNotificacionCategoria = 'informativo'
  for (const n of notifs) {
    const cat = TIPO_CATEGORIA[n.tipo] ?? 'informativo'
    if (CATEGORIA_PRIORIDAD[cat] > CATEGORIA_PRIORIDAD[max]) max = cat
  }
  return max
}

function formatFecha(fecha: string): string {
  const d = new Date(fecha)
  if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true, locale: es })
  if (isYesterday(d)) return `Ayer ${format(d, 'HH:mm', { locale: es })}`
  return format(d, "d MMM HH:mm", { locale: es })
}

function getNavUrl(
  tipo: string,
  rol: 'tecnico' | 'cliente' | 'admin',
  idIncidente: number | null,
  idPresupuesto: number | null,
): string | null {
  if (rol === 'tecnico') {
    if (tipo === 'nueva_asignacion') return '/tecnico/disponibles'
    if (idIncidente) return '/tecnico/trabajos'
    return null
  }
  if (rol === 'cliente') {
    if (idIncidente) return '/cliente/incidentes'
    if (idPresupuesto) return '/cliente/incidentes'
    return null
  }
  if (rol === 'admin') {
    if (tipo === 'nueva_conformidad') return '/dashboard/conformidades'
    if (['presupuesto_enviado', 'presupuesto_enviado_admin', 'presupuesto_aprobado_cliente', 'presupuesto_rechazado_cliente'].includes(tipo))
      return '/dashboard/presupuestos'
    if (tipo === 'solicitud_registro') return '/dashboard/tecnicos'
    if (idIncidente) return `/dashboard/incidentes?highlight=${idIncidente}`
    return null
  }
  return null
}

interface Props {
  notificaciones: Notificacion[]
  rol: 'tecnico' | 'cliente' | 'admin'
}

// ─── Componente de grupo por incidente (solo admin) ───────────────────────────
function GrupoIncidente({
  idIncidente,
  notifs,
  onDescartar,
  onDescartarGrupo,
  router,
}: {
  idIncidente: number | null
  notifs: Notificacion[]
  onDescartar: (e: React.MouseEvent, id: number) => void
  onDescartarGrupo: (ids: number[]) => void
  router: ReturnType<typeof useRouter>
}) {
  const [abierto, setAbierto] = useState(false)

  const categoriaMax = getCategoriaMaxGrupo(notifs)
  const cfg = CATEGORIA_CONFIG[categoriaMax]
  const Icon = cfg.icon
  const masReciente = notifs[0]?.fecha_creacion

  const handleClickNotif = (n: Notificacion) => {
    const url = getNavUrl(n.tipo, 'admin', n.id_incidente, n.id_presupuesto)
    if (!url) return
    onDescartar({ stopPropagation: () => {} } as React.MouseEvent, n.id_notificacion)
    router.push(url)
  }

  const irAlIncidente = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (idIncidente) router.push(`/dashboard/incidentes?highlight=${idIncidente}`)
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${cfg.border}`}>
      {/* Cabecera del grupo */}
      <button
        onClick={() => setAbierto(v => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 ${cfg.bg} transition-all hover:brightness-95`}
      >
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${cfg.iconColor}`} />

        <div className="flex-1 flex items-center gap-1.5 min-w-0 text-left">
          {idIncidente ? (
            <span
              onClick={irAlIncidente}
              className={`text-xs font-bold flex items-center gap-0.5 hover:underline ${cfg.titleColor}`}
            >
              <Hash className="h-3 w-3" />
              Incidente {idIncidente}
              <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
            </span>
          ) : (
            <span className={`text-xs font-bold ${cfg.titleColor}`}>General</span>
          )}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
            {notifs.length}
          </span>
          {!abierto && notifs[0] && (
            <span className="text-[10px] text-gray-500 truncate max-w-[160px] hidden sm:block">
              {notifs[0].titulo}
            </span>
          )}
        </div>

        {masReciente && (
          <span className="text-[10px] text-gray-400 shrink-0">{formatFecha(masReciente)}</span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onDescartarGrupo(notifs.map(n => n.id_notificacion)) }}
            className="p-1 rounded hover:bg-black/10 transition-colors"
            title="Descartar todas"
          >
            <CheckCheck className="h-3 w-3 text-gray-500" />
          </button>
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Notificaciones del grupo */}
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-gray-100">
              {notifs.map(n => {
                const ncfg = getCategoriaConfig(n.tipo)
                const NIcon = ncfg.icon
                return (
                  <motion.div
                    key={n.id_notificacion}
                    layout
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => handleClickNotif(n)}
                    className="flex items-center gap-2.5 px-3 py-2 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <NIcon className={`h-3.5 w-3.5 flex-shrink-0 ${ncfg.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-tight truncate ${ncfg.titleColor}`}>{n.titulo}</p>
                      <span className="text-[10px] text-gray-400">{formatFecha(n.fecha_creacion)}</span>
                    </div>
                    <button
                      onClick={e => onDescartar(e, n.id_notificacion)}
                      className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
                      title="Descartar"
                    >
                      <X className="h-3 w-3 text-gray-400" />
                    </button>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Panel principal ──────────────────────────────────────────────────────────
export function NotificacionesPanel({ notificaciones: inicial, rol }: Props) {
  const [items, setItems] = useState<Notificacion[]>(inicial)
  const [, startTransition] = useTransition()
  const [verTodos, setVerTodos] = useState(false)
  const [verTodosGrupos, setVerTodosGrupos] = useState(false)
  const router = useRouter()

  // Suscripción realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notificaciones-panel-${rol}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload) => {
        const nueva = payload.new as Notificacion
        if (nueva.fecha_leida) return
        const esParaEsteRol =
          (rol === 'admin' && nueva.para_admin) ||
          (rol === 'tecnico' && nueva.id_tecnico != null && !nueva.para_admin) ||
          (rol === 'cliente' && nueva.id_cliente != null && !nueva.para_admin)
        if (!esParaEsteRol) return
        setItems(prev => [nueva, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [rol])

  const descartar = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setItems(prev => prev.filter(n => n.id_notificacion !== id))
    startTransition(async () => {
      const res = await marcarNotificacionLeida(id)
      if (!res.success) toast.error('No se pudo descartar')
    })
  }

  const descartarGrupo = (ids: number[]) => {
    setItems(prev => prev.filter(n => !ids.includes(n.id_notificacion)))
    startTransition(async () => {
      await Promise.all(ids.map(id => marcarNotificacionLeida(id)))
    })
  }

  const descartarTodas = () => {
    setItems([])
    startTransition(async () => {
      const res = await marcarTodasLeidas(rol)
      if (!res.success) toast.error('No se pudieron marcar como leídas')
    })
  }

  const handleClick = (n: Notificacion) => {
    const url = getNavUrl(n.tipo, rol, n.id_incidente, n.id_presupuesto)
    if (!url) return
    setItems(prev => prev.filter(x => x.id_notificacion !== n.id_notificacion))
    marcarNotificacionLeida(n.id_notificacion).catch(() => {})
    router.push(url)
  }

  // ── Render notificación individual (tecnico / cliente) ──
  const renderNotif = (n: Notificacion) => {
    const cfg = getCategoriaConfig(n.tipo)
    const Icon = cfg.icon
    const navUrl = getNavUrl(n.tipo, rol, n.id_incidente, n.id_presupuesto)
    const esClickeable = !!navUrl

    return (
      <motion.div
        key={n.id_notificacion}
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.15 }}
      >
        <div
          onClick={() => esClickeable && handleClick(n)}
          className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-all ${cfg.bg} ${cfg.border} ${
            esClickeable ? 'cursor-pointer hover:brightness-95' : ''
          }`}
        >
          <div className={`flex-shrink-0 ${cfg.iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold leading-tight truncate ${cfg.titleColor}`}>{n.titulo}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-gray-400">{formatFecha(n.fecha_creacion)}</span>
              {esClickeable && (
                <span className={`text-[10px] font-medium flex items-center gap-0.5 ${cfg.iconColor}`}>
                  · Ver <ExternalLink className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
          </div>
          <button
            onClick={e => descartar(e, n.id_notificacion)}
            className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            title="Descartar"
          >
            <X className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </div>
      </motion.div>
    )
  }

  // ── Agrupación por incidente (solo admin) ──
  const renderAdmin = () => {
    const grupos = new Map<number | null, Notificacion[]>()
    for (const n of items) {
      const key = n.id_incidente ?? null
      if (!grupos.has(key)) grupos.set(key, [])
      grupos.get(key)!.push(n)
    }

    const gruposOrdenados = Array.from(grupos.entries()).sort(([, a], [, b]) => {
      const prioA = CATEGORIA_PRIORIDAD[getCategoriaMaxGrupo(a)]
      const prioB = CATEGORIA_PRIORIDAD[getCategoriaMaxGrupo(b)]
      if (prioB !== prioA) return prioB - prioA
      return new Date(b[0].fecha_creacion).getTime() - new Date(a[0].fecha_creacion).getTime()
    })

    const visibles = verTodosGrupos ? gruposOrdenados : gruposOrdenados.slice(0, MAX_GRUPOS)
    const ocultos = gruposOrdenados.length - MAX_GRUPOS

    return (
      <>
        <AnimatePresence mode="popLayout">
          {visibles.map(([idIncidente, notifs]) => (
            <motion.div
              key={idIncidente ?? 'general'}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              <GrupoIncidente
                idIncidente={idIncidente}
                notifs={notifs}
                onDescartar={descartar}
                onDescartarGrupo={descartarGrupo}
                router={router}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {!verTodosGrupos && ocultos > 0 && (
          <button
            onClick={() => setVerTodosGrupos(true)}
            className="w-full text-xs text-center text-blue-600 hover:text-blue-700 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Ver {ocultos} grupo{ocultos > 1 ? 's' : ''} más
          </button>
        )}
        {verTodosGrupos && gruposOrdenados.length > MAX_GRUPOS && (
          <button
            onClick={() => setVerTodosGrupos(false)}
            className="w-full text-xs text-center text-gray-400 hover:text-gray-600 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Mostrar menos
          </button>
        )}
      </>
    )
  }

  // ── Agrupación Hoy/Anteriores (tecnico / cliente) ──
  const renderHoyAnteriores = () => {
    const hoy = items.filter(n => isToday(new Date(n.fecha_creacion)))
    const anteriores = items.filter(n => !isToday(new Date(n.fecha_creacion)))
    const todos = [...hoy, ...anteriores]
    const visibles = verTodos ? todos : todos.slice(0, MAX_ITEMS)
    const ocultos = todos.length - MAX_ITEMS

    const hoyVisibles = visibles.filter(n => isToday(new Date(n.fecha_creacion)))
    const anterioresVisibles = visibles.filter(n => !isToday(new Date(n.fecha_creacion)))

    return (
      <>
        {hoyVisibles.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">Hoy</p>
            <AnimatePresence mode="popLayout">
              {hoyVisibles.map(n => renderNotif(n))}
            </AnimatePresence>
          </div>
        )}
        {anterioresVisibles.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">Anteriores</p>
            <AnimatePresence mode="popLayout">
              {anterioresVisibles.map(n => renderNotif(n))}
            </AnimatePresence>
          </div>
        )}

        {!verTodos && ocultos > 0 && (
          <button
            onClick={() => setVerTodos(true)}
            className="w-full text-xs text-center text-blue-600 hover:text-blue-700 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Ver {ocultos} notificacion{ocultos > 1 ? 'es' : ''} más
          </button>
        )}
        {verTodos && todos.length > MAX_ITEMS && (
          <button
            onClick={() => setVerTodos(false)}
            className="w-full text-xs text-center text-gray-400 hover:text-gray-600 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Mostrar menos
          </button>
        )}
      </>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">
            {items.length > 0 ? `${items.length} sin leer` : 'Notificaciones'}
          </span>
        </div>
        {items.length > 0 && (
          <button
            onClick={descartarTodas}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas leídas
          </button>
        )}
      </div>

      {/* Estado vacío */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-2">
            <Inbox className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Todo al día</p>
          <p className="text-xs text-gray-400 mt-0.5">No hay notificaciones pendientes</p>
        </div>
      )}

      {/* Contenido agrupado */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {rol === 'admin' ? renderAdmin() : renderHoyAnteriores()}
        </div>
      )}
    </div>
  )
}
