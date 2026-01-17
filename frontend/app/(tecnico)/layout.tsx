'use client'

import { TecnicoNav } from '@/components/tecnico/tecnico-nav'
import { AIHelpChat } from '@/components/ai-help-chat'
import { PageTransitionProvider, PageTransition } from '@/components/ui/page-transition'

const tecnicoRoutes = [
  '/tecnico',
  '/tecnico/trabajos',
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
        <main className="p-4 overflow-hidden">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <AIHelpChat />
      </div>
    </PageTransitionProvider>
  )
}
