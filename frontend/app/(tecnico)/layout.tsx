import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TecnicoNav } from '@/components/tecnico/tecnico-nav'

export default async function TecnicoLayout({
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

  // Verificar que el usuario sea técnico
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!usuario || usuario.rol !== 'tecnico') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TecnicoNav />
      <main className="p-4">
        {children}
      </main>
    </div>
  )
}
