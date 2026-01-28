'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Building2, Wrench, Clock, AlertCircle, CheckCircle, Activity, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface Stats {
  incidentesPendientes: number
  incidentesEnProceso: number
  incidentesResueltos: number
  propiedades: number
  clientes: number
  tecnicos: number
}

interface IncidenteReciente {
  id_incidente: number
  descripcion_problema: string
  estado_actual: string
  fecha_registro: string
  fecha_modificacion: string
  clientes: {
    nombre: string
    apellido: string
  } | null
  inmuebles: {
    calle: string | null
    altura: string | null
  } | null
}

interface AsignacionReciente {
  id_asignacion: number
  fecha_asignacion: string
  tecnicos: {
    nombre: string
    apellido: string
  } | null
  incidentes: {
    id_incidente: number
    descripcion_problema: string
  } | null
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
  const [incidentesRecientes, setIncidentesRecientes] = useState<IncidenteReciente[]>([])
  const [asignacionesRecientes, setAsignacionesRecientes] = useState<AsignacionReciente[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    cargarStats()
    cargarActividad()
  }, [])

  const cargarStats = async () => {
    try {
      // Cargar incidentes
      const { data: incidentes } = await supabase
        .from('incidentes')
        .select('estado_actual')

      const pendientes = incidentes?.filter(i =>
        i.estado_actual === 'pendiente'
      ).length || 0

      const enProceso = incidentes?.filter(i =>
        i.estado_actual === 'en_proceso'
      ).length || 0

      const resueltos = incidentes?.filter(i =>
        i.estado_actual === 'resuelto'
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

  const cargarActividad = async () => {
    try {
      // Cargar incidentes recientes (últimos 5 modificados o creados)
      const { data: incidentes } = await supabase
        .from('incidentes')
        .select(`
          id_incidente,
          descripcion_problema,
          estado_actual,
          fecha_registro,
          fecha_modificacion,
          clientes:id_cliente_reporta (nombre, apellido),
          inmuebles:id_propiedad (calle, altura)
        `)
        .order('fecha_modificacion', { ascending: false })
        .limit(5)

      if (incidentes) {
        setIncidentesRecientes(incidentes as unknown as IncidenteReciente[])
      }

      // Cargar asignaciones recientes (últimas 5)
      const { data: asignaciones } = await supabase
        .from('asignaciones_tecnico')
        .select(`
          id_asignacion,
          fecha_asignacion,
          tecnicos (nombre, apellido),
          incidentes (id_incidente, descripcion_problema)
        `)
        .order('fecha_asignacion', { ascending: false })
        .limit(5)

      if (asignaciones) {
        setAsignacionesRecientes(asignaciones as unknown as AsignacionReciente[])
      }
    } catch (error) {
      console.error('Error al cargar actividad:', error)
    }
  }

  const getEstadoBadge = (estado: string) => {
    const estilos: Record<string, string> = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'en_proceso': 'bg-blue-100 text-blue-800',
      'resuelto': 'bg-green-100 text-green-800',
    }
    const labels: Record<string, string> = {
      'pendiente': 'Pendiente',
      'en_proceso': 'En Proceso',
      'resuelto': 'Resuelto',
    }
    return (
      <Badge className={estilos[estado] || 'bg-gray-100 text-gray-800'}>
        {labels[estado] || estado}
      </Badge>
    )
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

      {/* Actividad Reciente */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Incidentes Recientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Actividad Reciente
                </CardTitle>
                <CardDescription>
                  Últimos incidentes actualizados
                </CardDescription>
              </div>
              <Link
                href="/dashboard/incidentes"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {incidentesRecientes.length > 0 ? (
              <div className="space-y-4">
                {incidentesRecientes.map((incidente) => (
                  <div
                    key={incidente.id_incidente}
                    className="flex items-start justify-between gap-4 pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          #{incidente.id_incidente}
                        </span>
                        {getEstadoBadge(incidente.estado_actual)}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {incidente.descripcion_problema}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {incidente.clientes
                          ? `${incidente.clientes.nombre} ${incidente.clientes.apellido}`
                          : 'Sin cliente'
                        }
                        {incidente.inmuebles?.calle && (
                          <> • {incidente.inmuebles.calle} {incidente.inmuebles.altura}</>
                        )}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(incidente.fecha_modificacion), {
                        addSuffix: true,
                        locale: es
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay actividad reciente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Asignaciones Recientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Asignaciones Recientes
                </CardTitle>
                <CardDescription>
                  Últimos técnicos asignados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {asignacionesRecientes.length > 0 ? (
              <div className="space-y-4">
                {asignacionesRecientes.map((asignacion) => (
                  <div
                    key={asignacion.id_asignacion}
                    className="flex items-start justify-between gap-4 pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Wrench className="h-4 w-4 text-orange-500" />
                        <span className="font-medium text-sm">
                          {asignacion.tecnicos
                            ? `${asignacion.tecnicos.nombre} ${asignacion.tecnicos.apellido}`
                            : 'Técnico desconocido'
                          }
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        Incidente #{asignacion.incidentes?.id_incidente}: {asignacion.incidentes?.descripcion_problema}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(asignacion.fecha_asignacion), {
                        addSuffix: true,
                        locale: es
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay asignaciones recientes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
