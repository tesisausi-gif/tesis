import { getEspecialidades } from '@/features/usuarios/usuarios.service'
import { ConfiguracionContent } from '@/components/admin/configuracion-content.client'

export default async function ConfiguracionPage() {
  const especialidades = await getEspecialidades()

  return <ConfiguracionContent especialidades={especialidades} />
}
