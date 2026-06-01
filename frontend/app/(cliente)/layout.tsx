'use client'

import { useEffect, useState } from 'react'
import { ClienteNav } from '@/components/cliente/cliente-nav'
import { CambiarPasswordPrimerAcceso } from '@/components/cliente/cambiar-password-primer-acceso.client'
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

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [debeCambiarPassword, setDebeCambiarPassword] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.user_metadata?.debe_cambiar_password === true) {
        setDebeCambiarPassword(true)
      }
    })
  }, [])

  return (
    <PageTransitionProvider routes={clienteRoutes}>
      <div className="min-h-screen bg-gray-50 pb-16">
        <ClienteNav />
        <PullToRefresh>
          <main className="p-4 overflow-hidden">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </PullToRefresh>
        <AIHelpChat />
      </div>
      {debeCambiarPassword && <CambiarPasswordPrimerAcceso onSuccess={() => setDebeCambiarPassword(false)} />}
    </PageTransitionProvider>
  )
}
