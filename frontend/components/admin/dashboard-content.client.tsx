'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Building2, Wrench, Clock, AlertCircle, CheckCircle, Activity, ArrowRight, Wifi, WifiOff, FileText, ClipboardCheck, DollarSign, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/shared/lib/supabase/client'
import { getDashboardStats, getDashboardActividad } from '@/features/incidentes/incidentes.service'
import { getAdminBadgeCounts, AdminBadgeCounts } from '@/features/notificaciones/badge-counts.service'

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
  fecha_creacion: string
  tecnicos: {
    nombre: string
    apellido: string
  } | null
  incidentes: {
    id_incidente: number
    descripcion_problema: string
  } | null
}

interface DashboardContentProps {
  stats: Stats
  incidentesRecientes: IncidenteReciente[]
  asignacionesRecientes: AsignacionReciente[]
}

const getEstadoBadge = (estado: string) => {
  const estilos: Record<string, string> = {
    'pendiente': 'bg-yellow-100 text-yellow-800',
    'asignacion_solicitada': 'bg-orange-100 text-orange-800',
    'en_proceso': 'bg-blue-100 text-blue-800',
    'resuelto': 'bg-green-100 text-green-800',
  }
  const labels: Record<string, string> = {
    'pendiente': 'Pendiente',
    'asignacion_solicitada': 'Asig. Solicitada',
    'en_proceso': 'En Proceso',
    'resuelto': 'Resuelto',
  }
  return (
    <Badge className={estilos[estado] || 'bg-gray-100 text-gray-800'}>
      {labels[estado] || estado}
    </Badge>
  )
}

export function DashboardContent({ stats: initialStats, incidentesRecientes: initialIncidentes, asignacionesRecientes: initialAsignaciones }: DashboardContentProps) {
  const [stats, setStats] = useState<Stats>(initialStats)
  const [incidentesRecientes, setIncidentesRecientes] = useState<IncidenteReciente[]>(initialIncidentes)
  const [asignacionesRecientes, setAsignacionesRecientes] = useState<AsignacionReciente[]>(initialAsignaciones)
  const [conectado, setConectado] = useState(false)
  const refreshingRef = useRef(false)
  const [pendientes, setPendientes] = useState<AdminBadgeCounts>({ conformidades: 0, presupuestos: 0, pagos: 0, solicitudes: 0, reasignaciones: 0 })

  const refrescarDatos = async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    try {
      const [nuevosStats, nuevaActividad] = await Promise.all([
        getDashboardStats(),
        getDashboardActividad(),
      ])
      setStats(nuevosStats)
      setIncidentesRecientes(nuevaActividad.incidentesRecientes as unknown as IncidenteReciente[])
      setAsignacionesRecientes(nuevaActividad.asignacionesRecientes as unknown as AsignacionReciente[])
    } catch {
      // silencioso: no interrumpir la UX si falla el refresh
    } finally {
      refreshingRef.current = false
    }
  }

  useEffect(() => {
    getAdminBadgeCounts().then(setPendientes).catch(() => {})
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Canal único para todas las suscripciones del dashboard
    const canal = supabase
      .channel('dashboard-admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidentes' },
        (payload) => {
          toast.info('Nuevo incidente reportado', {
            description: `Incidente #${payload.new.id_incidente} ingresado al sistema`,
            duration: 5000,
          })
          refrescarDatos()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidentes' },
        () => {
          refrescarDatos()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'asignaciones_tecnico' },
        () => {
          refrescarDatos()
        }
      )
      .subscribe((status) => {
        setConectado(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Bienvenido al sistema de gestión de incidentes
          </p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${conectado ? 'text-green-700 border-green-200 bg-green-50' : 'text-gray-400 border-gray-200 bg-gray-50'}`}>
          {conectado
            ? <><Wifi className="h-3 w-3" /> En vivo</>
            : <><WifiOff className="h-3 w-3" /> Conectando...</>
          }
        </div>
      </div>

      {/* Stats Cards - Primera fila: Incidentes */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidentes Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.incidentesPendientes}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidentes En Proceso</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.incidentesEnProceso}</div>
            <p className="text-xs text-muted-foreground">Siendo atendidos</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidentes Resueltos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.incidentesResueltos}</div>
            <p className="text-xs text-muted-foreground">Completados</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - Segunda fila: Entidades */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientes}</div>
            <p className="text-xs text-muted-foreground">Clientes activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos</CardTitle>
            <Wrench className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tecnicos}</div>
            <p className="text-xs text-muted-foreground">Técnicos activos</p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones Pendientes */}
      {(pendientes.conformidades > 0 || pendientes.presupuestos > 0 || pendientes.pagos > 0 || pendientes.reasignaciones > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Requieren atención
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pendientes.conformidades > 0 && (
              <Link href="/dashboard/conformidades">
                <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between pt-4 pb-4">
                    <div>
                      <p className="text-xs text-gray-500">Conformidades</p>
                      <p className="text-xl font-bold text-orange-600">{pendientes.conformidades}</p>
                      <p className="text-xs text-gray-500">fotos a revisar</p>
                    </div>
                    <ClipboardCheck className="h-8 w-8 text-orange-400" />
                  </CardContent>
                </Card>
              </Link>
            )}
            {pendientes.presupuestos > 0 && (
              <Link href="/dashboard/presupuestos">
                <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between pt-4 pb-4">
                    <div>
                      <p className="text-xs text-gray-500">Presupuestos</p>
                      <p className="text-xl font-bold text-blue-600">{pendientes.presupuestos}</p>
                      <p className="text-xs text-gray-500">esperan aprobación</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-400" />
                  </CardContent>
                </Card>
              </Link>
            )}
            {pendientes.pagos > 0 && (
              <Link href="/dashboard/pagos">
                <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between pt-4 pb-4">
                    <div>
                      <p className="text-xs text-gray-500">Pagos</p>
                      <p className="text-xl font-bold text-green-600">{pendientes.pagos}</p>
                      <p className="text-xs text-gray-500">pendientes de cobro/pago</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-400" />
                  </CardContent>
                </Card>
              </Link>
            )}
            {pendientes.reasignaciones > 0 && (
              <Link href="/dashboard/incidentes?tab=asignacion_solicitada">
                <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between pt-4 pb-4">
                    <div>
                      <p className="text-xs text-gray-500">Re-asignaciones</p>
                      <p className="text-xl font-bold text-red-600">{pendientes.reasignaciones}</p>
                      <p className="text-xs text-gray-500">técnicos rechazaron</p>
                    </div>
                    <Send className="h-8 w-8 text-red-400" />
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      )}

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
                <CardDescription>Últimos incidentes reportados</CardDescription>
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
              <div className="space-y-1">
                {incidentesRecientes.map((incidente) => (
                  <Link
                    key={incidente.id_incidente}
                    href={`/dashboard/incidentes?highlight=${incidente.id_incidente}`}
                    className="flex items-start justify-between gap-4 py-3 px-2 -mx-2 rounded-md border-b last:border-0 hover:bg-blue-50/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm group-hover:text-blue-700 transition-colors">#{incidente.id_incidente}</span>
                        {getEstadoBadge(incidente.estado_actual)}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {incidente.descripcion_problema}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {incidente.clientes
                          ? `${incidente.clientes.nombre} ${incidente.clientes.apellido}`
                          : 'Sin cliente'}
                        {incidente.inmuebles?.calle && (
                          <> • {incidente.inmuebles.calle} {incidente.inmuebles.altura}</>
                        )}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(incidente.fecha_registro), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </div>
                  </Link>
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
                <CardDescription>Últimos técnicos asignados</CardDescription>
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
                            : 'Técnico desconocido'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        Incidente #{asignacion.incidentes?.id_incidente}: {asignacion.incidentes?.descripcion_problema}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(asignacion.fecha_creacion || asignacion.fecha_asignacion), {
                        addSuffix: true,
                        locale: es,
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
