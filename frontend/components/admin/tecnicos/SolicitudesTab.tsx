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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Eye, Filter } from 'lucide-react'
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Solicitudes de Registro</CardTitle>
              <CardDescription>
                Revisa y aprueba las solicitudes de técnicos que desean registrarse
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filtroEstado} onValueChange={(value: any) => handleFiltroEstado(value)}>
                <SelectTrigger className="w-[180px]">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitudesPaginadas.map((solicitud) => (
                    <TableRow key={solicitud.id_solicitud}>
                      <TableCell className="font-medium">
                        {solicitud.nombre} {solicitud.apellido}
                      </TableCell>
                      <TableCell>{solicitud.email}</TableCell>
                      <TableCell>
                        {(() => {
                          const esps = resolverEspecialidades(solicitud)
                          return esps.length > 0 ? esps.join(', ') : '-'
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getEstadoSolicitudColor(solicitud.estado_solicitud)}>
                          {solicitud.estado_solicitud}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-AR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirDetalle(solicitud)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
