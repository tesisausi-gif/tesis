'use client'

import { useEffect, useState } from 'react'
import { ClienteNav } from '@/components/cliente/cliente-nav'
import { RealtimeNotificacionesCliente } from '@/components/cliente/realtime-notificaciones-cliente.client'
import { CambiarPasswordPrimerAcceso } from '@/components/cliente/cambiar-password-primer-acceso.client'
import { VerificarEmailOverlay } from '@/components/cliente/verificar-email-overlay.client'
import { AIHelpChat } from '@/components/ai-help-chat'
import { PageTransitionProvider, PageTransition } from '@/components/ui/page-transition'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { createClient } from '@/shared/lib/supabase/client'

const clienteRoutes = [
  '/cliente',
  '/cliente/incidentes',
  '/cliente/incidentes/nuevo',
  '/cliente/propiedades',
  '/cliente/perfil',
]

interface ClienteVerificacion {
  idCliente: number
  email: string
  nombre: string
}

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [debeCambiarPassword, setDebeCambiarPassword] = useState(false)
  const [verificacionPendiente, setVerificacionPendiente] = useState<ClienteVerificacion | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) return

      if (user.user_metadata?.debe_cambiar_password === true) {
        setDebeCambiarPassword(true)
      }

      // Verificar si el cliente ya confirmó su email
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id_cliente, clientes(nombre, email_verificado)')
        .eq('id', user.id)
        .maybeSingle()

      if (!usuario?.id_cliente) return

      const clienteData = Array.isArray(usuario.clientes)
        ? usuario.clientes[0]
        : usuario.clientes

      if (clienteData && clienteData.email_verificado === false) {
        setVerificacionPendiente({
          idCliente: usuario.id_cliente,
          email: user.email ?? '',
          nombre: clienteData.nombre ?? '',
        })
      }
    })
  }, [])

  return (
    <PageTransitionProvider routes={clienteRoutes}>
      <div className="min-h-screen bg-gray-50 pb-16">
        <ClienteNav />
        <RealtimeNotificacionesCliente />
        <PullToRefresh>
          <main className="p-4 overflow-hidden">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </PullToRefresh>
        <AIHelpChat rol="cliente" />
      </div>
      {debeCambiarPassword && <CambiarPasswordPrimerAcceso onSuccess={() => setDebeCambiarPassword(false)} />}
      {verificacionPendiente && (
        <VerificarEmailOverlay
          idCliente={verificacionPendiente.idCliente}
          email={verificacionPendiente.email}
          nombre={verificacionPendiente.nombre}
          onSuccess={() => setVerificacionPendiente(null)}
        />
      )}
    </PageTransitionProvider>
  )
}
