'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Bell, CheckCheck, XCircle, CheckCircle2,
  AlertTriangle, Info, X, ChevronDown, Hash, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/shared/lib/supabase/client'
import { getCurrentUser } from '@/features/auth/auth.service'
import {
  marcarNotificacionLeida,
  marcarTodasLeidas,
  eliminarNotificacion,
} from '@/features/notificaciones/notificaciones-inapp.service'
import { TIPO_CATEGORIA } from '@/features/notificaciones/notificaciones.types'
import type { Notificacion, TipoNotificacionCategoria } from '@/features/notificaciones/notificaciones.types'

const MAX_GRUPOS = 5
const POR_PAGINA = 5

// ─── Config visual por categoría ─────────────────────────────────────────────

const CATEGORIA_CONFIG: Record<TipoNotificacionCategoria, {
  icon: React.ElementType
  iconColor: string
  dot: string
  badge: string
  groupBorder: string
}> = {
  urgente: {
    icon: XCircle,
    iconColor: 'text-red-500',
    dot: 'bg-red-400',
    badge: 'bg-red-50 text-red-600 border-red-100',
    groupBorder: 'border-l-red-400',
  },
  positivo: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    groupBorder: 'border-l-emerald-400',
  },
  pendiente: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
    groupBorder: 'border-l-amber-400',
  },
  informativo: {
    icon: Info,
    iconColor: 'text-blue-500',
    dot: 'bg-blue-400',
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
    groupBorder: 'border-l-blue-400',
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
  if (isToday(d)) return formatDistanceToNow(d, { addSuffix: false, locale: es })
  if (isYesterday(d)) return `Ayer ${format(d, 'HH:mm')}`
  return format(d, "d MMM", { locale: es })
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

// ─── Item individual ──────────────────────────────────────────────────────────

function NotifItem({
  n, rol,
  onDescartar,
  onNavigate,
}: {
  n: Notificacion
  rol: 'tecnico' | 'cliente' | 'admin'
  onDescartar: (e: React.MouseEvent, id: number) => void
  onNavigate: (n: Notificacion) => void
}) {
  const cfg = getCategoriaConfig(n.tipo)
  const Icon = cfg.icon
  const navUrl = getNavUrl(n.tipo, rol, n.id_incidente, n.id_presupuesto)
  const esClickeable = !!navUrl

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.15 }}
    >
      <div
        onClick={() => esClickeable && onNavigate(n)}
        className={`group/item relative flex items-start gap-3 border-b border-gray-100 last:border-0 px-3 py-3 rounded-md transition-colors ${
          esClickeable ? 'cursor-pointer hover:bg-gray-50' : ''
        }`}
      >
        <div className={`mt-0.5 shrink-0 ${cfg.iconColor}`}>
          <Icon size={16} />
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-gray-800 leading-snug pr-10">
            {n.titulo}
          </p>
          <p className="text-xs text-gray-400">{formatFecha(n.fecha_creacion)}</p>
        </div>

        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          <button
            onClick={e => onDescartar(e, n.id_notificacion)}
            className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
            title="Eliminar notificación"
            aria-label="Eliminar notificación"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Grupo por incidente (admin) ──────────────────────────────────────────────

function GrupoIncidente({
  idIncidente, notifs, onDescartar, onDescartarGrupo, router,
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
      {/* Cabecera — div en vez de button para poder anidar el botón de descartar */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setAbierto(v => !v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setAbierto(v => !v) }}
        className="w-full flex items-center gap-2.5 px-3.5 py-3 hover:bg-gray-50 transition-colors text-left cursor-pointer"
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.iconColor}`} />

        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          {idIncidente ? (
            <span
              onClick={irAlIncidente}
              className="text-xs font-bold text-gray-700 flex items-center gap-0.5 hover:underline"
            >
              <Hash className="h-2.5 w-2.5" />Incidente {idIncidente}
              <ExternalLink className="h-2.5 w-2.5 text-gray-400 ml-0.5" />
            </span>
          ) : (
            <span className="text-xs font-bold text-gray-700">General</span>
          )}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
            {notifs.length}
          </span>
          {!abierto && notifs[0] && (
            <span className="text-[11px] text-gray-400 truncate max-w-[130px] hidden sm:block">
              {notifs[0].titulo}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {notifs[0]?.fecha_creacion && (
            <span className="text-[10px] text-gray-400">{formatFecha(notifs[0].fecha_creacion)}</span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDescartarGrupo(notifs.map(n => n.id_notificacion)) }}
            className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            title="Descartar todas"
          >
            <CheckCheck className="h-3 w-3 text-gray-400" />
          </button>
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Items colapsables */}
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="bg-white border-t border-gray-100">
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
                    className="group/inner relative flex items-start gap-2.5 border-b border-gray-100 last:border-0 px-3.5 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <NIcon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${ncfg.iconColor}`} />
                    <div className="flex-1 min-w-0 pr-6 space-y-0.5">
                      <p className="text-xs font-semibold text-gray-800 leading-snug">{n.titulo}</p>
                      <p className="text-[10px] text-gray-400">{formatFecha(n.fecha_creacion)}</p>
                    </div>
                    <button
                      onClick={e => onDescartar(e, n.id_notificacion)}
                      className="absolute right-3 top-2.5 p-0.5 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover/inner:opacity-100"
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
  const [pagina, setPagina] = useState(1)
  const [verTodosGrupos, setVerTodosGrupos] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let cancelado = false
    // Buffer de eventos que llegan antes de que getCurrentUser() resuelva.
    // getCurrentUser() es un Server Action y hace un round-trip al servidor
    // (~300-500ms). Sin buffer, las notificaciones que llegan en ese lapso
    // se pierden y el panel nunca las muestra.
    const pendingBuffer: Notificacion[] = []
    let userInfo: { id_tecnico?: number | null; id_cliente?: number | null } | null = null

    const esParaEsteUsuario = (n: Notificacion) => {
      if (n.fecha_leida) return false
      if (!userInfo) return false
      return (
        (rol === 'admin' && n.para_admin) ||
        (rol === 'tecnico' && !n.para_admin && n.id_tecnico != null && n.id_tecnico === userInfo.id_tecnico) ||
        (rol === 'cliente' && !n.para_admin && n.id_cliente != null && n.id_cliente === userInfo.id_cliente)
      )
    }

    // Suscribirse INMEDIATAMENTE, sin esperar a getCurrentUser()
    const channel = supabase
      .channel(`notificaciones-panel-${rol}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload) => {
        const nueva = payload.new as Notificacion
        if (!userInfo) {
          // Aún no tenemos datos del usuario: bufferear para procesar después
          pendingBuffer.push(nueva)
          return
        }
        if (!esParaEsteUsuario(nueva)) return
        setItems(prev => {
          if (prev.some(n => n.id_notificacion === nueva.id_notificacion)) return prev
          return [nueva, ...prev]
        })
      })
      .subscribe()

    // Resolver identidad del usuario en paralelo; procesar los eventos bufferados
    getCurrentUser().then((user) => {
      if (cancelado || !user) return
      userInfo = { id_tecnico: user.id_tecnico, id_cliente: user.id_cliente }
      // Vaciar el buffer acumulado durante la espera del Server Action
      const paraAgregar = pendingBuffer.splice(0).filter(esParaEsteUsuario)
      if (paraAgregar.length > 0) {
        setItems(prev => {
          const nuevos = paraAgregar.filter(n => !prev.some(p => p.id_notificacion === n.id_notificacion))
          return nuevos.length ? [...nuevos.reverse(), ...prev] : prev
        })
      }
    }).catch(() => {})

    return () => {
      cancelado = true
      supabase.removeChannel(channel)
    }
  }, [rol])

  // Eliminar 1 notificación (delete real, no marcar como leída)
  const descartar = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setItems(prev => prev.filter(n => n.id_notificacion !== id))
    startTransition(async () => {
      const res = await eliminarNotificacion(id, rol)
      if (!res.success) toast.error('No se pudo eliminar la notificación')
    })
  }

  // Eliminar todo el grupo (usado por admin al cerrar un grupo por incidente)
  const descartarGrupo = (ids: number[]) => {
    setItems(prev => prev.filter(n => !ids.includes(n.id_notificacion)))
    startTransition(async () => {
      await Promise.all(ids.map(id => eliminarNotificacion(id, rol)))
    })
  }

  // Marcar todas como leídas (mantiene el registro pero las saca del inbox)
  const marcarTodasComoLeidas = () => {
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

  // ── Admin: grupos por incidente ──
  const renderAdmin = () => {
    const grupos = new Map<number | null, Notificacion[]>()
    for (const n of items) {
      const key = n.id_incidente ?? null
      if (!grupos.has(key)) grupos.set(key, [])
      grupos.get(key)!.push(n)
    }

    const gruposOrdenados = Array.from(grupos.entries()).sort(([, a], [, b]) => {
      const fechaA = Math.max(...a.map(n => new Date(n.fecha_creacion).getTime()))
      const fechaB = Math.max(...b.map(n => new Date(n.fecha_creacion).getTime()))
      return fechaB - fechaA
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
          <button onClick={() => setVerTodosGrupos(true)} className="w-full text-xs text-center text-blue-500 hover:text-blue-700 py-1.5 rounded-lg hover:bg-blue-50 transition-colors mt-1">
            Ver {ocultos} grupo{ocultos > 1 ? 's' : ''} más
          </button>
        )}
        {verTodosGrupos && gruposOrdenados.length > MAX_GRUPOS && (
          <button onClick={() => setVerTodosGrupos(false)} className="w-full text-xs text-center text-gray-400 hover:text-gray-600 py-1.5 rounded-lg hover:bg-gray-50 transition-colors mt-1">
            Mostrar menos
          </button>
        )}
      </>
    )
  }

  // ── Técnico/Cliente: paginado de 5 + secciones Hoy / Anteriores ──
  const renderHoyAnteriores = () => {
    // Orden: primero las de hoy, luego anteriores (fecha desc dentro de cada grupo)
    const hoy = items
      .filter(n => isToday(new Date(n.fecha_creacion)))
      .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
    const anteriores = items
      .filter(n => !isToday(new Date(n.fecha_creacion)))
      .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
    const todos = [...hoy, ...anteriores]

    // Paginación de 5
    const totalPaginas = Math.max(1, Math.ceil(todos.length / POR_PAGINA))
    const paginaActual = Math.min(pagina, totalPaginas)
    const inicio = (paginaActual - 1) * POR_PAGINA
    const visibles = todos.slice(inicio, inicio + POR_PAGINA)

    const hoyVis = visibles.filter(n => isToday(new Date(n.fecha_creacion)))
    const antVis = visibles.filter(n => !isToday(new Date(n.fecha_creacion)))

    return (
      <>
        {hoyVis.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 mb-0.5">Hoy</p>
            <div className="divide-y divide-gray-100">
              <AnimatePresence mode="popLayout">
                {hoyVis.map(n => (
                  <NotifItem key={n.id_notificacion} n={n} rol={rol} onDescartar={descartar} onNavigate={handleNavigate} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
        {antVis.length > 0 && (
          <div className={hoyVis.length > 0 ? 'mt-3' : ''}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 mb-0.5">Anteriores</p>
            <div className="divide-y divide-gray-100">
              <AnimatePresence mode="popLayout">
                {antVis.map(n => (
                  <NotifItem key={n.id_notificacion} n={n} rol={rol} onDescartar={descartar} onNavigate={handleNavigate} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-[11px] text-gray-500 font-medium">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              type="button"
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-1">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bell className="h-4 w-4 text-gray-500" />
            {items.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-3.5 min-w-3.5 px-0.5 rounded-full bg-gray-900 flex items-center justify-center">
                <span className="text-[8px] font-black text-white leading-none">{items.length > POR_PAGINA ? `${POR_PAGINA}+` : items.length}</span>
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-gray-800 tracking-tight">Notificaciones</span>
          {items.length > 0 && (
            <span className="text-[10px] font-semibold text-gray-400">{items.length} sin leer</span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={marcarTodasComoLeidas}
            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
            title="Marca todas como leídas (no las elimina)"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar leídas
          </button>
        )}
      </div>

      {/* ── Estado vacío ── */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-3">
            <Bell className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Todo al día</p>
          <p className="text-xs text-gray-400 mt-0.5">Sin notificaciones pendientes</p>
        </div>
      )}

      {/* ── Lista ── */}
      {items.length > 0 && (
        <div className="space-y-1.5 mt-1">
          {rol === 'admin' ? renderAdmin() : renderHoyAnteriores()}
        </div>
      )}
    </div>
  )
}
