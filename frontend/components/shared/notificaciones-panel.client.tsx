'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Bell, CheckCheck, XCircle, CheckCircle2, Clock,
  AlertTriangle, Info, X, ExternalLink, Inbox,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/shared/lib/supabase/client'
import { marcarNotificacionLeida, marcarTodasLeidas } from '@/features/notificaciones/notificaciones-inapp.service'
import { TIPO_CATEGORIA } from '@/features/notificaciones/notificaciones.types'
import type { Notificacion, TipoNotificacionCategoria } from '@/features/notificaciones/notificaciones.types'

// ─── Config visual por categoría ─────────────────────────────────────────────
const CATEGORIA_CONFIG: Record<TipoNotificacionCategoria, {
  icon: React.ElementType
  bg: string
  border: string
  iconColor: string
  titleColor: string
  msgColor: string
  dot: string
}> = {
  urgente: {
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-900',
    msgColor: 'text-red-700',
    dot: 'bg-red-500',
  },
  positivo: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-900',
    msgColor: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  pendiente: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    msgColor: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  informativo: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    msgColor: 'text-blue-700',
    dot: 'bg-blue-500',
  },
}

function getCategoriaConfig(tipo: string) {
  const cat = TIPO_CATEGORIA[tipo] ?? 'informativo'
  return CATEGORIA_CONFIG[cat]
}

function formatFecha(fecha: string): string {
  const d = new Date(fecha)
  if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true, locale: es })
  if (isYesterday(d)) return `Ayer a las ${format(d, 'HH:mm', { locale: es })}`
  return format(d, "d MMM 'a las' HH:mm", { locale: es })
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

export function NotificacionesPanel({ notificaciones: inicial, rol }: Props) {
  const [items, setItems] = useState<Notificacion[]>(inicial)
  const [, startTransition] = useTransition()
  const router = useRouter()

  // Suscripción realtime para recibir notificaciones nuevas sin recargar
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notificaciones-panel-${rol}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (payload) => {
          const nueva = payload.new as Notificacion
          // Solo agregar si corresponde al rol actual y no está leída
          if (nueva.fecha_leida) return
          const esParaEsteRol =
            (rol === 'admin' && nueva.para_admin) ||
            (rol === 'tecnico' && nueva.id_tecnico != null && !nueva.para_admin) ||
            (rol === 'cliente' && nueva.id_cliente != null && !nueva.para_admin)
          if (!esParaEsteRol) return
          setItems(prev => [nueva, ...prev])
        }
      )
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

  const descartarTodas = () => {
    const ids = items.map(n => n.id_notificacion)
    setItems([])
    startTransition(async () => {
      const res = await marcarTodasLeidas(rol)
      if (!res.success) {
        toast.error('No se pudieron marcar como leídas')
        // No restauramos el estado para evitar confusión
      }
    })
  }

  // Separar en hoy vs anteriores
  const hoy = items.filter(n => isToday(new Date(n.fecha_creacion)))
  const anteriores = items.filter(n => !isToday(new Date(n.fecha_creacion)))

  const handleClick = (n: Notificacion) => {
    const url = getNavUrl(n.tipo, rol, n.id_incidente, n.id_presupuesto)
    if (!url) return
    // Marcar como leída y sacar de la lista (fire-and-forget)
    setItems(prev => prev.filter(x => x.id_notificacion !== n.id_notificacion))
    marcarNotificacionLeida(n.id_notificacion).catch(() => {})
    router.push(url)
  }

  const renderNotif = (n: Notificacion) => {
    const cfg = getCategoriaConfig(n.tipo)
    const Icon = cfg.icon
    const navUrl = getNavUrl(n.tipo, rol, n.id_incidente, n.id_presupuesto)
    const esClickeable = !!navUrl

    return (
      <motion.div
        key={n.id_notificacion}
        layout
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: 24, scale: 0.95 }}
        transition={{ duration: 0.18 }}
      >
        <div
          onClick={() => esClickeable && handleClick(n)}
          className={`relative flex items-start gap-3 rounded-xl border p-3.5 transition-all ${cfg.bg} ${cfg.border} ${
            esClickeable ? 'cursor-pointer hover:brightness-95 active:scale-[0.99]' : ''
          }`}
        >
          {/* Dot indicador de no leída */}
          <span className={`absolute top-3 right-9 h-2 w-2 rounded-full ${cfg.dot}`} />

          {/* Icono */}
          <div className={`flex-shrink-0 mt-0.5 ${cfg.iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-tight ${cfg.titleColor}`}>{n.titulo}</p>
            <p className={`text-xs mt-0.5 leading-relaxed ${cfg.msgColor}`}>{n.mensaje}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="text-[10px] text-gray-400">{formatFecha(n.fecha_creacion)}</span>
              {esClickeable && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className={`text-[10px] font-medium flex items-center gap-0.5 ${cfg.iconColor}`}>
                    Ver más <ExternalLink className="h-2.5 w-2.5" />
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Botón descartar */}
          <button
            onClick={e => descartar(e, n.id_notificacion)}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors"
            title="Descartar"
          >
            <X className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header con acción "marcar todas" */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-700" />
          <span className="text-sm font-semibold text-gray-700">
            {items.length > 0 ? `${items.length} sin leer` : 'Notificaciones'}
          </span>
        </div>
        {items.length > 0 && (
          <button
            onClick={descartarTodas}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Estado vacío */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-3">
            <Inbox className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Todo al día</p>
          <p className="text-xs text-gray-400 mt-1">No hay notificaciones pendientes</p>
        </div>
      )}

      {/* Grupo HOY */}
      {hoy.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">Hoy</p>
          <AnimatePresence mode="popLayout">
            {hoy.map(n => renderNotif(n))}
          </AnimatePresence>
        </div>
      )}

      {/* Grupo ANTERIORES */}
      {anteriores.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">Anteriores</p>
          <AnimatePresence mode="popLayout">
            {anteriores.map(n => renderNotif(n))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
