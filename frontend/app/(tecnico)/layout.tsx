import { TecnicoNav } from '@/components/tecnico/tecnico-nav'
import { AIHelpChat } from '@/components/ai-help-chat'

// El middleware ya maneja la autenticación y verificación de roles
// Este layout puede ser estático para mejor rendimiento
export default function TecnicoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TecnicoNav />
      <main className="p-4">
        {children}
      </main>
      <AIHelpChat />
    </div>
  )
}
