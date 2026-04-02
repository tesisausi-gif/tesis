'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import {
  getSolicitudesRegistro,
  rechazarSolicitud as rechazarSolicitudService,
  aprobarSolicitudTecnico,
} from '@/features/usuarios/usuarios.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Filter, Mail } from 'lucide-react'
import { Paginacion } from '@/components/ui/paginacion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Solicitud {
  id_solicitud: number
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  dni: string | null
  especialidad: string | null
  especialidades: string[]
  direccion: string | null
  estado_solicitud: string
  fecha_solicitud: string
}

export default function SolicitudesTab() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null)
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
      setSolicitudes(data as Solicitud[])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }

  const abrirDialog = (solicitud: Solicitud) => {
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
        description: `Se envió un email a ${selectedSolicitud.email} con la contraseña temporal.`,
      })

      setDialogOpen(false)
      setSelectedSolicitud(null)
      cargarSolicitudes()
      window.dispatchEvent(new CustomEvent('admin-badges-refresh'))

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al aprobar solicitud')
    } finally {
      setProcesando(false)
    }
  }

  const rechazarSolicitud = async (id: number) => {
    if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return

    try {
      const result = await rechazarSolicitudService(id)

      if (!result.success) {
        toast.error('Error al rechazar solicitud')
        return
      }

      toast.success('Solicitud rechazada')
      cargarSolicitudes()
      window.dispatchEvent(new CustomEvent('admin-badges-refresh'))
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al rechazar solicitud')
    }
  }

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aprobada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800',
    }
    return colors[estado] || 'bg-gray-100 text-gray-800'
  }

// Filtrar solicitudes según el estado seleccionado
  const solicitudesFiltradas = solicitudes.filter((solicitud) => {
    if (filtroEstado === 'todas') return true
    return solicitud.estado_solicitud === filtroEstado
  })

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

            {/* Filtro de Estado */}
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
            <p className="text-center text-gray-600 py-4">
              No hay solicitudes
            </p>
          ) : solicitudesFiltradas.length === 0 ? (
            <p className="text-center text-gray-600 py-4">
              No hay solicitudes {filtroEstado !== 'todas' ? `en estado "${filtroEstado}"` : ''}
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
                        const esps = solicitud.especialidades?.length
                          ? solicitud.especialidades
                          : solicitud.especialidad ? [solicitud.especialidad] : []
                        return esps.length > 0 ? esps.join(', ') : '-'
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getEstadoColor(solicitud.estado_solicitud)}>
                        {solicitud.estado_solicitud}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(solicitud.fecha_solicitud).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {solicitud.estado_solicitud === 'pendiente' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirDialog(solicitud)}
                            title="Aprobar"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => rechazarSolicitud(solicitud.id_solicitud)}
                            title="Rechazar"
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Aprobar solicitud de técnico</DialogTitle>
            <DialogDescription>
              Se creará la cuenta y se enviará un email con la contraseña temporal al técnico.
            </DialogDescription>
          </DialogHeader>
          {selectedSolicitud && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nombre</span>
                  <span className="font-medium">{selectedSolicitud.nombre} {selectedSolicitud.apellido}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium">{selectedSolicitud.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Especialidades</span>
                  <span className="font-medium text-right max-w-[220px]">
                    {(() => {
                      const esps = selectedSolicitud.especialidades?.length
                        ? selectedSolicitud.especialidades
                        : selectedSolicitud.especialidad ? [selectedSolicitud.especialidad] : []
                      return esps.length > 0 ? esps.join(', ') : 'No especificada'
                    })()}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
                <span>
                  El sistema generará una contraseña temporal segura y la enviará por email
                  al técnico. En su primer inicio de sesión deberá cambiarla obligatoriamente.
                </span>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={procesando}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={aprobarSolicitud}
                  disabled={procesando}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {procesando ? 'Aprobando...' : 'Aprobar y enviar email'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
