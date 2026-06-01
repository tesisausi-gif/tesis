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
  iconBg: string
  iconColor: string
  dot: string
  titleColor: string
  badge: string
  groupBorder: string
  groupBg: string
}> = {
  urgente: {
    icon: XCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    dot: 'bg-red-500',
    titleColor: 'text-red-600',
    badge: 'bg-red-100 text-red-700 border-red-200',
    groupBorder: 'border-l-red-400',
    groupBg: 'bg-red-50/50',
  },
  positivo: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    dot: 'bg-emerald-500',
    titleColor: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    groupBorder: 'border-l-emerald-400',
    groupBg: 'bg-emerald-50/50',
  },
  pendiente: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    dot: 'bg-amber-500',
    titleColor: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    groupBorder: 'border-l-amber-400',
    groupBg: 'bg-amber-50/50',
  },
  informativo: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    dot: 'bg-blue-500',
    titleColor: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    groupBorder: 'border-l-blue-400',
    groupBg: 'bg-blue-50/50',
  },
}

const CATEGORIA_PRIORIDAD: Record<TipoNotificacionCategoria, number> = {
  urgente: 3, pendiente: 2, positivo: 1, informativo: 0,
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

// ─── Item de notificación individual ─────────────────────────────────────────
function NotifItem({
  n,
  onDescartar,
  onNavigate,
  rol,
}: {
  n: Notificacion
  onDescartar: (e: React.MouseEvent, id: number) => void
  onNavigate: (n: Notificacion) => void
  rol: 'tecnico' | 'cliente' | 'admin'
}) {
  const cfg = getCategoriaConfig(n.tipo)
  const Icon = cfg.icon
  const navUrl = getNavUrl(n.tipo, rol, n.id_incidente, n.id_presupuesto)
  const esClickeable = !!navUrl

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="group/item"
    >
      <div
        onClick={() => esClickeable && onNavigate(n)}
        className={`flex items-start gap-3 py-3.5 ${esClickeable ? 'cursor-pointer' : ''}`}
      >
        {/* Icon in colored circle */}
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-800 truncate flex-1 leading-tight">{n.titulo}</p>
            {/* Unread dot */}
            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-400">{formatFecha(n.fecha_creacion)}</span>
            {esClickeable && (
              <span className={`text-[11px] font-medium flex items-center gap-0.5 ${cfg.iconColor} opacity-0 group-hover/item:opacity-100 transition-opacity`}>
                · Ver <ExternalLink className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={e => onDescartar(e, n.id_notificacion)}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors mt-0.5 opacity-0 group-hover/item:opacity-100"
          title="Descartar"
        >
          <X className="h-3 w-3 text-gray-400" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Grupo por incidente (solo admin) ────────────────────────────────────────
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
    <div className={`rounded-xl border border-gray-100 border-l-[3px] overflow-hidden ${cfg.groupBorder}`}>
      {/* Cabecera del grupo */}
      <button
        onClick={() => setAbierto(v => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-all hover:bg-gray-50 ${cfg.groupBg}`}
      >
        <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
          <Icon className={`h-3 w-3 ${cfg.iconColor}`} />
        </div>

        <div className="flex-1 flex items-center gap-1.5 min-w-0 text-left">
          {idIncidente ? (
            <span
              onClick={irAlIncidente}
              className="text-xs font-bold flex items-center gap-0.5 text-gray-700 hover:underline"
            >
              <Hash className="h-3 w-3" />
              Incidente {idIncidente}
              <ExternalLink className="h-2.5 w-2.5 ml-0.5 text-gray-400" />
            </span>
          ) : (
            <span className="text-xs font-bold text-gray-700">General</span>
          )}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
            {notifs.length}
          </span>
          {!abierto && notifs[0] && (
            <span className="text-[11px] text-gray-400 truncate max-w-[140px] hidden sm:block">
              {notifs[0].titulo}
            </span>
          )}
        </div>

        {notifs[0]?.fecha_creacion && (
          <span className="text-[10px] text-gray-400 shrink-0">{formatFecha(notifs[0].fecha_creacion)}</span>
        )}

        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            onClick={e => { e.stopPropagation(); onDescartarGrupo(notifs.map(n => n.id_notificacion)) }}
            className="p-1 rounded-md hover:bg-black/10 transition-colors"
            title="Descartar todas"
          >
            <CheckCheck className="h-3 w-3 text-gray-500" />
          </button>
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Items del grupo */}
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-dashed divide-gray-100 px-3 bg-white">
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
                    className="flex items-start gap-2.5 py-3 cursor-pointer group/inner hover:bg-gray-50 -mx-3 px-3"
                  >
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${ncfg.iconBg}`}>
                      <NIcon className={`h-3 w-3 ${ncfg.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{n.titulo}</p>
                      <span className="text-[10px] text-gray-400">{formatFecha(n.fecha_creacion)}</span>
                    </div>
                    <button
                      onClick={e => onDescartar(e, n.id_notificacion)}
                      className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors opacity-0 group-hover/inner:opacity-100"
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

  const handleNavigate = (n: Notificacion) => {
    const url = getNavUrl(n.tipo, rol, n.id_incidente, n.id_presupuesto)
    if (!url) return
    setItems(prev => prev.filter(x => x.id_notificacion !== n.id_notificacion))
    marcarNotificacionLeida(n.id_notificacion).catch(() => {})
    router.push(url)
  }

  // ── Admin: agrupado por incidente ──
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

  // ── Técnico/Cliente: Hoy / Anteriores ──
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
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 mb-1">Hoy</p>
            <div className="divide-y divide-dashed divide-gray-100">
              <AnimatePresence mode="popLayout">
                {hoyVisibles.map(n => (
                  <NotifItem key={n.id_notificacion} n={n} onDescartar={descartar} onNavigate={handleNavigate} rol={rol} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
        {anterioresVisibles.length > 0 && (
          <div className={hoyVisibles.length > 0 ? 'mt-3' : ''}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 mb-1">Anteriores</p>
            <div className="divide-y divide-dashed divide-gray-100">
              <AnimatePresence mode="popLayout">
                {anterioresVisibles.map(n => (
                  <NotifItem key={n.id_notificacion} n={n} onDescartar={descartar} onNavigate={handleNavigate} rol={rol} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {!verTodos && ocultos > 0 && (
          <button
            onClick={() => setVerTodos(true)}
            className="w-full text-xs text-center text-blue-600 hover:text-blue-700 py-1.5 rounded-lg hover:bg-blue-50 transition-colors mt-2"
          >
            Ver {ocultos} notificacion{ocultos > 1 ? 'es' : ''} más
          </button>
        )}
        {verTodos && todos.length > MAX_ITEMS && (
          <button
            onClick={() => setVerTodos(false)}
            className="w-full text-xs text-center text-gray-400 hover:text-gray-600 py-1.5 rounded-lg hover:bg-gray-50 transition-colors mt-2"
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
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-8 w-8 rounded-xl bg-gray-100 flex items-center justify-center">
              <Bell className="h-3.5 w-3.5 text-gray-600" />
            </div>
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-slate-900 flex items-center justify-center">
                <span className="text-[9px] font-black text-white leading-none">{items.length > 9 ? '9+' : items.length}</span>
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-gray-800">Notificaciones</span>
        </div>
        {items.length > 0 && (
          <button
            onClick={descartarTodas}
            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar leídas
          </button>
        )}
      </div>

      {/* Estado vacío */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' }}
          >
            <Inbox className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-gray-700">Todo al día</p>
          <p className="text-xs text-gray-400 mt-0.5">No hay notificaciones pendientes</p>
        </div>
      )}

      {/* Contenido */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {rol === 'admin' ? renderAdmin() : renderHoyAnteriores()}
        </div>
      )}
    </div>
  )
}
