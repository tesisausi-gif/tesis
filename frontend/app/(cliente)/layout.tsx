import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClienteNav } from '@/components/cliente/cliente-nav'
import { AIHelpChat } from '@/components/ai-help-chat'

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar que el usuario sea cliente
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!usuario || usuario.rol !== 'cliente') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <ClienteNav />
      <main className="p-4">
        {children}
      </main>
      <AIHelpChat />
    </div>
  )
}
