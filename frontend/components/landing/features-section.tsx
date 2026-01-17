import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Clock, UserCheck, LayoutDashboard } from 'lucide-react'

const features = [
  {
    icon: AlertCircle,
    title: 'Reporta Incidentes Fácilmente',
    description: 'Crea reportes detallados con fotos y descripción. El proceso es rápido y sencillo.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Clock,
    title: 'Seguimiento en Tiempo Real',
    description: 'Monitorea el estado de tus incidentes. Recibe notificaciones de cada actualización.',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: UserCheck,
    title: 'Técnicos Calificados',
    description: 'Contamos con profesionales especializados en distintas áreas para resolver tu problema.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    icon: LayoutDashboard,
    title: 'Panel de Administración',
    description: 'Gestiona propiedades, técnicos e incidentes desde un único lugar centralizado.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
]

export function FeaturesSection() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Todo lo que necesitas
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Una plataforma completa para la gestión de incidentes
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="pt-6">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.bgColor}`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
