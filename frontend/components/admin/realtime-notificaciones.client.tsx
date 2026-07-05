'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/shared/lib/supabase/client'

/**
 * Componente invisible que escucha cambios en presupuestos en tiempo real
 * y muestra toasts al admin cuando hay eventos relevantes.
 */
export function RealtimeNotificacionesAdmin() {
  const router = useRouter()
  // Con REPLICA IDENTITY DEFAULT, payload.old solo trae la PK: no se puede
  // confiar en prev.estado_presupuesto para detectar la transición. Se deduplica
  // por id: un presupuesto solo dispara el toast la primera vez que se lo ve
  // aprobado en esta sesión.
  const aprobadosVistos = useRef<Set<number>>(new Set())

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('presupuestos-admin-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presupuestos' }, (payload) => {
        const next = payload.new as any
        const prev = payload.old as any

        if (next?.estado_presupuesto !== 'aprobado') return
        // Si payload.old trae el estado (REPLICA IDENTITY FULL) y ya era
        // aprobado, no es una transición: ignorar.
        if (prev?.estado_presupuesto === 'aprobado') return
        if (aprobadosVistos.current.has(next.id_presupuesto)) return
        aprobadosVistos.current.add(next.id_presupuesto)

        toast.success('Cliente aprobó un presupuesto', {
          description: `Incidente #${next.id_incidente} — el trabajo puede comenzar`,
        })
        router.refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [router])

  return null
}
