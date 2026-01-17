'use client'

import { ClienteNav } from '@/components/cliente/cliente-nav'
import { AIHelpChat } from '@/components/ai-help-chat'
import { PageTransitionProvider, PageTransition } from '@/components/ui/page-transition'

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
  return (
    <PageTransitionProvider routes={clienteRoutes}>
      <div className="min-h-screen bg-gray-50 pb-16">
        <ClienteNav />
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
