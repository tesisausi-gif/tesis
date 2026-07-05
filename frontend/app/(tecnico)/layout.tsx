'use client'

import { TecnicoNav } from '@/components/tecnico/tecnico-nav'
import { RealtimeNotificacionesTecnico } from '@/components/tecnico/realtime-notificaciones-tecnico.client'
import { AIHelpChat } from '@/components/ai-help-chat'
import { PageTransitionProvider, PageTransition } from '@/components/ui/page-transition'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'

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
  return (
    <PageTransitionProvider routes={tecnicoRoutes}>
      <div className="min-h-screen bg-gray-50 pb-16">
        <TecnicoNav />
        <RealtimeNotificacionesTecnico />
        <PullToRefresh>
          <main className="p-4 overflow-hidden">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </PullToRefresh>
        <AIHelpChat rol="tecnico" />
      </div>
    </PageTransitionProvider>
  )
}
