'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import {
  getSolicitudesRegistro,
  rechazarSolicitud as rechazarSolicitudService,
  aprobarSolicitudTecnico,
} from '@/features/usuarios/usuarios.service'
import type { SolicitudRegistro } from '@/features/usuarios/usuarios.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Eye, Filter, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Paginacion } from '@/components/ui/paginacion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SolicitudDetalleModal } from './SolicitudDetalleModal'
import { getEstadoSolicitudColor, resolverEspecialidades } from './solicitudes.utils'

export default function SolicitudesTab() {
  const [solicitudes, setSolicitudes] = useState<SolicitudRegistro[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudRegistro | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada'>('todas')
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    cargarSolicitudes()

    const supabase = createClient()
    const channel = supabase
      .channel('solicitudes-admin-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_registro' }, () => {
        cargarSolicitudes()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const cargarSolicitudes = async () => {
    try {
      const data = await getSolicitudesRegistro()
      setSolicitudes(data as SolicitudRegistro[])
    } catch {
      toast.error('Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }

  const abrirDetalle = (solicitud: SolicitudRegistro) => {
    setSelectedSolicitud(solicitud)
    setDialogOpen(true)
  }

  const aprobarSolicitud = async () => {
    if (!selectedSolicitud) return
    setProcesando(true)
    try {
      const result = await aprobarSolicitudTecnico(selectedSolicitud.id_solicitud)
      if (!result.success) {
        toast.error('Error al aprobar solicitud', { description: result.error })
        return
      }
      toast.success('Técnico aprobado', {
        description: `Se intentó enviar email con credenciales a ${selectedSolicitud.email}.`,
        duration: 8000,
      })
      setDialogOpen(false)
      setSelectedSolicitud(null)
      cargarSolicitudes()
      window.dispatchEvent(new CustomEvent('admin-badges-refresh'))
    } catch {
      toast.error('Error al aprobar solicitud')
    } finally {
      setProcesando(false)
    }
  }

  const rechazarDesdeModal = async () => {
    if (!selectedSolicitud) return
    setProcesando(true)
    try {
      const result = await rechazarSolicitudService(selectedSolicitud.id_solicitud)
      if (!result.success) {
        toast.error('Error al rechazar solicitud')
        return
      }
      toast.success('Solicitud rechazada')
      setDialogOpen(false)
      setSelectedSolicitud(null)
      cargarSolicitudes()
      window.dispatchEvent(new CustomEvent('admin-badges-refresh'))
    } catch {
      toast.error('Error al rechazar solicitud')
    } finally {
      setProcesando(false)
    }
  }

  const solicitudesFiltradas = solicitudes.filter((s) =>
    filtroEstado === 'todas' ? true : s.estado_solicitud === filtroEstado
  )

  const solicitudesPaginadas = solicitudesFiltradas.slice((pagina - 1) * 10, pagina * 10)

  const handleFiltroEstado = (value: typeof filtroEstado) => {
    setFiltroEstado(value)
    setPagina(1)
  }

  const pendientes = solicitudes.filter(s => s.estado_solicitud === 'pendiente').length
  const aprobadas = solicitudes.filter(s => s.estado_solicitud === 'aprobada').length
  const rechazadas = solicitudes.filter(s => s.estado_solicitud === 'rechazada').length

  return (
    <>
      {/* Stats cards — misma estructura que TecnicosTab */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Pendientes
            </CardDescription>
            <CardTitle className="text-3xl text-amber-600">{pendientes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              Aprobadas
            </CardDescription>
            <CardTitle className="text-3xl text-green-600">{aprobadas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-gray-400" />
              Rechazadas
            </CardDescription>
            <CardTitle className="text-3xl text-gray-500">{rechazadas}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabla principal */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Solicitudes de Registro</CardTitle>
              <CardDescription>
                Revisá y aprobá las solicitudes de técnicos que desean registrarse
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500 hidden sm:block" />
              <Select value={filtroEstado} onValueChange={(value: typeof filtroEstado) => handleFiltroEstado(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="aprobada">Aprobadas</SelectItem>
                  <SelectItem value="rechazada">Rechazadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-center text-gray-600 py-4">Cargando solicitudes...</p>
          ) : solicitudes.length === 0 ? (
            <p className="text-center text-gray-600 py-4">No hay solicitudes</p>
          ) : solicitudesFiltradas.length === 0 ? (
            <p className="text-center text-gray-600 py-4">
              No hay solicitudes{filtroEstado !== 'todas' ? ` en estado "${filtroEstado}"` : ''}
            </p>
          ) : (
            <>
              {/* Lista de cards — evita scroll horizontal */}
              <div className="divide-y divide-gray-100">
                {solicitudesPaginadas.map((solicitud) => {
                  const esps = resolverEspecialidades(solicitud)
                  const espsVisibles = esps.slice(0, 3)
                  const espsResto = esps.length - 3
                  return (
                    <div
                      key={solicitud.id_solicitud}
                      className="flex items-center gap-3 py-3 hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
                    >
                      {/* Avatar inicial */}
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-slate-500">
                          {solicitud.nombre?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      </div>

                      {/* Nombre + email */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {solicitud.nombre} {solicitud.apellido}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{solicitud.email}</p>
                      </div>

                      {/* Especialidades — máx 3 visible + "+N" con tooltip */}
                      <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px]">
                        {esps.length > 0 ? (
                          <>
                            {espsVisibles.map(e => (
                              <Badge key={e} variant="secondary" className="text-[11px] px-1.5 py-0.5">
                                {e}
                              </Badge>
                            ))}
                            {espsResto > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[11px] px-1.5 py-0.5 text-gray-500 cursor-default">+{espsResto}</Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {esps.slice(3).join(', ')}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>

                      {/* Fecha */}
                      <span className="hidden md:block text-xs text-gray-400 shrink-0 w-20 text-right">
                        {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-AR')}
                      </span>

                      {/* Estado */}
                      <Badge className={`${getEstadoSolicitudColor(solicitud.estado_solicitud)} shrink-0`}>
                        {solicitud.estado_solicitud}
                      </Badge>

                      {/* Acción */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => abrirDetalle(solicitud)}
                        title="Ver detalle"
                        className="shrink-0"
                      >
                        <Eye className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              <Paginacion pagina={pagina} total={solicitudesFiltradas.length} onChange={setPagina} />
            </>
          )}
        </CardContent>
      </Card>

      <SolicitudDetalleModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        solicitud={selectedSolicitud}
        onAprobar={aprobarSolicitud}
        onRechazar={rechazarDesdeModal}
        procesando={procesando}
      />
    </>
  )
}
