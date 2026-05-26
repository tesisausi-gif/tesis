'use client'

import { useEffect, useState } from 'react'
import { TecnicoNav } from '@/components/tecnico/tecnico-nav'
import { CambiarPasswordPrimerAccesoTecnico } from '@/components/tecnico/cambiar-password-primer-acceso.client'
import { AIHelpChat } from '@/components/ai-help-chat'
import { PageTransitionProvider, PageTransition } from '@/components/ui/page-transition'
import { createClient } from '@/shared/lib/supabase/client'

const tecnicoRoutes = [
  '/tecnico',
  '/tecnico/disponibles',
  '/tecnico/trabajos',
  '/tecnico/presupuestos',
  '/tecnico/perfil',
]

export default function TecnicoLayout({
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
    <PageTransitionProvider routes={tecnicoRoutes}>
      <div className="min-h-screen bg-gray-50 pb-16">
        <TecnicoNav />
        <main className="p-4 overflow-hidden">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <AIHelpChat />
      </div>
      {debeCambiarPassword && <CambiarPasswordPrimerAccesoTecnico onSuccess={() => setDebeCambiarPassword(false)} />}
    </PageTransitionProvider>
  )
}
