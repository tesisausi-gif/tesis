import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Users, Building2, Wrench } from 'lucide-react'

export default function DashboardPage() {
  // Estos datos serán dinámicos desde Supabase
  const stats = [
    {
      title: 'Incidentes Activos',
      value: '0',
      description: 'Incidentes en proceso',
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Propiedades',
      value: '0',
      description: 'Total de propiedades',
      icon: Building2,
      color: 'text-green-600',
    },
    {
      title: 'Clientes',
      value: '0',
      description: 'Clientes registrados',
      icon: Users,
      color: 'text-purple-600',
    },
    {
      title: 'Técnicos',
      value: '0',
      description: 'Técnicos activos',
      icon: Wrench,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Bienvenido al sistema de gestión de incidentes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incidentes Recientes</CardTitle>
            <CardDescription>
              Últimos incidentes reportados en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No hay incidentes recientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas acciones en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No hay actividad reciente
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
