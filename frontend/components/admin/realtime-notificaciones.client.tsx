'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/shared/lib/supabase/client'

/**
 * Componente invisible que escucha cambios en presupuestos en tiempo real
 * y muestra toasts al admin cuando hay eventos relevantes.
 */
export function RealtimeNotificacionesAdmin() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('presupuestos-admin-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presupuestos' }, (payload) => {
        const next = payload.new as any
        const prev = payload.old as any

        if (next?.estado_presupuesto === 'aprobado' && prev?.estado_presupuesto !== 'aprobado') {
          toast.success('Cliente aprobó un presupuesto', {
            description: `Incidente #${next.id_incidente} — el trabajo puede comenzar`,
          })
          router.refresh()
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [router])

  return null
}
