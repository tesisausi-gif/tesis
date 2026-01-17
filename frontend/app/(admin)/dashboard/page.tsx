'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Users, Building2, Wrench, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  incidentesPendientes: number
  incidentesEnProceso: number
  incidentesResueltos: number
  propiedades: number
  clientes: number
  tecnicos: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    incidentesPendientes: 0,
    incidentesEnProceso: 0,
    incidentesResueltos: 0,
    propiedades: 0,
    clientes: 0,
    tecnicos: 0,
  })
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    cargarStats()
  }, [])

  const cargarStats = async () => {
    try {
      // Cargar incidentes
      const { data: incidentes } = await supabase
        .from('incidentes')
        .select('estado_actual')

      const pendientes = incidentes?.filter(i =>
        i.estado_actual === 'pendiente' || i.estado_actual === 'registrado'
      ).length || 0

      const enProceso = incidentes?.filter(i =>
        i.estado_actual === 'en_proceso' || i.estado_actual === 'asignado'
      ).length || 0

      const resueltos = incidentes?.filter(i =>
        i.estado_actual === 'resuelto' || i.estado_actual === 'finalizado' || i.estado_actual === 'cerrado'
      ).length || 0

      // Cargar propiedades
      const { count: propiedadesCount } = await supabase
        .from('inmuebles')
        .select('*', { count: 'exact', head: true })
        .eq('esta_activo', 1)

      // Cargar clientes
      const { count: clientesCount } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('esta_activo', 1)

      // Cargar técnicos
      const { count: tecnicosCount } = await supabase
        .from('tecnicos')
        .select('*', { count: 'exact', head: true })
        .eq('esta_activo', 1)

      setStats({
        incidentesPendientes: pendientes,
        incidentesEnProceso: enProceso,
        incidentesResueltos: resueltos,
        propiedades: propiedadesCount || 0,
        clientes: clientesCount || 0,
        tecnicos: tecnicosCount || 0,
      })
    } catch (error) {
      console.error('Error al cargar stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Bienvenido al sistema de gestión de incidentes
        </p>
      </div>

      {/* Stats Cards - Primera fila: Incidentes */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Incidentes Pendientes
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.incidentesPendientes}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Incidentes En Proceso
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.incidentesEnProceso}</div>
            <p className="text-xs text-muted-foreground">
              Siendo atendidos
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Incidentes Resueltos
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.incidentesResueltos}</div>
            <p className="text-xs text-muted-foreground">
              Completados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - Segunda fila: Entidades */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Propiedades
            </CardTitle>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.propiedades}</div>
            <p className="text-xs text-muted-foreground">
              Inmuebles registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientes}</div>
            <p className="text-xs text-muted-foreground">
              Clientes activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Técnicos
            </CardTitle>
            <Wrench className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tecnicos}</div>
            <p className="text-xs text-muted-foreground">
              Técnicos activos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
