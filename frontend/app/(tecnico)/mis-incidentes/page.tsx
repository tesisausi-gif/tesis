import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock, CheckCircle } from 'lucide-react'

export default function TecnicoHomePage() {
  // Estos datos serán dinámicos desde Supabase
  const stats = [
    {
      title: 'Pendientes',
      value: '0',
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      title: 'En Proceso',
      value: '0',
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Completados',
      value: '0',
      icon: CheckCircle,
      color: 'text-green-600',
    },
  ]

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bienvenido</h2>
        <p className="text-muted-foreground">
          Resumen de tus incidentes asignados
        </p>
      </div>

      <div className="grid gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximas Visitas</CardTitle>
          <CardDescription>
            Incidentes programados para hoy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay visitas programadas
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
