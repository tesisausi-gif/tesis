import { createClient } from '@/shared/lib/supabase/server'
import { TecnicoPerfilContent } from '@/components/tecnico/tecnico-perfil-content.client'

export default async function TecnicoPerfil() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*, tecnicos(*)')
    .eq('id', user.id)
    .single()

  const tecnico = Array.isArray(usuario?.tecnicos)
    ? usuario.tecnicos[0]
    : usuario?.tecnicos

  if (!tecnico) {
    return null
  }

  return (
    <TecnicoPerfilContent
      tecnico={tecnico as any}
      email={user.email || ''}
    />
  )
}
