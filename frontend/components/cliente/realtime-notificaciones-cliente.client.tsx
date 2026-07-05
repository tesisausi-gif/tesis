'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/shared/lib/supabase/client'
import { getCurrentUser } from '@/features/auth/auth.service'
import type { Notificacion } from '@/features/notificaciones/notificaciones.types'

/**
 * Listener persistente montado en el layout del cliente.
 * Muestra un toast y refresca el badge del nav cuando llega
 * una notificación nueva, sin importar en qué página esté.
 */
export function RealtimeNotificacionesCliente() {
  const vistasRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    let cancelado = false
    const pendingBuffer: Notificacion[] = []
    let idCliente: number | null = null

    const procesarNotificacion = (nueva: Notificacion) => {
      if (idCliente === null || nueva.id_cliente !== idCliente) return
      if (vistasRef.current.has(nueva.id_notificacion)) return
      vistasRef.current.add(nueva.id_notificacion)
      toast.info(nueva.titulo, { duration: 5000 })
      window.dispatchEvent(new CustomEvent('cliente-badges-refresh'))
    }

    const channel = supabase
      .channel('notif-cliente-global-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload) => {
        const nueva = payload.new as Notificacion
        if (idCliente === null) { pendingBuffer.push(nueva); return }
        procesarNotificacion(nueva)
      })
      .subscribe()

    getCurrentUser().then((user) => {
      if (cancelado || !user?.id_cliente) return
      idCliente = user.id_cliente
      pendingBuffer.splice(0).forEach(procesarNotificacion)
    }).catch(() => {})

    return () => {
      cancelado = true
      supabase.removeChannel(channel)
    }
  }, [])

  return null
}
