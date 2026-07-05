'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/shared/lib/supabase/client'
import { getCurrentUser } from '@/features/auth/auth.service'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'

/**
 * Listener persistente montado en el layout del técnico.
 * Muestra un toast y refresca el badge del nav cuando llega
 * una notificación nueva, sin importar en qué página esté.
 */
export function RealtimeNotificacionesTecnico() {
  const vistasRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelado = false

    getCurrentUser().then((user) => {
      if (cancelado || !user?.id_tecnico) return

      channel = supabase
        .channel('notif-tecnico-global-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload) => {
          const nueva = payload.new as Notificacion
          if (nueva.id_tecnico !== user.id_tecnico) return
          if (vistasRef.current.has(nueva.id_notificacion)) return
          vistasRef.current.add(nueva.id_notificacion)

          toast.info(nueva.titulo, { duration: 5000 })
          window.dispatchEvent(new CustomEvent('tecnico-badges-refresh'))
        })
        .subscribe()
    }).catch(() => {})

    return () => {
      cancelado = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  return null
}
