'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle, Search, Filter, Eye, Users, Clock, CheckCircle, Wrench, ExternalLink, Send, XCircle } from 'lucide-react'
import Link from 'next/link'
import { EstadoIncidente, CategoriaIncidente } from '@/shared/types'
import { getEstadoIncidenteLabel } from '@/shared/utils/colors'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import { ModalAsignarTecnico } from '@/components/admin/modal-asignar-tecnico'
import { GestionarPendienteModal } from '@/components/admin/gestionar-pendiente-modal'
import type { IncidenteConCliente } from '@/features/incidentes/incidentes.types'

interface IncidentesAdminContentProps {
  incidentes: IncidenteConCliente[]
}

const estados = Object.values(EstadoIncidente)
const categorias = Object.values(CategoriaIncidente)

export function IncidentesAdminContent({ incidentes }: IncidentesAdminContentProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAsignarOpen, setModalAsignarOpen] = useState(false)
  const [incidenteParaAsignar, setIncidenteParaAsignar] = useState<IncidenteConCliente | null>(null)
  const [modalGestionarOpen, setModalGestionarOpen] = useState(false)
  const [incidenteParaGestionar, setIncidenteParaGestionar] = useState<IncidenteConCliente | null>(null)
  const [tabActiva, setTabActiva] = useState(() => searchParams.get('tab') || 'pendiente')
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const highlightRef = useRef<HTMLTableRowElement | null>(null)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setTabActiva(tab)

    const id = searchParams.get('highlight')
    if (!id) return
    const numId = parseInt(id)
    const incidente = incidentes.find(i => i.id_incidente === numId)
    if (!incidente) return
    setTabActiva(incidente.estado_actual)
    setHighlightId(numId)
    setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setHighlightId(null), 2200)
    }, 200)
  }, [])

  // Realtime: actualizar tabla automáticamente cuando técnico acepta/rechaza
  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel('incidentes-admin')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidentes' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'asignaciones_tecnico' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [])

  const incidentesFiltrados = incidentes.filter((incidente) => {
    if (filtroEstado !== 'todos' && incidente.estado_actual !== filtroEstado) {
      return false
    }

    if (filtroCategoria !== 'todos' && incidente.categoria !== filtroCategoria) {
      return false
    }

    if (busqueda) {
      const searchLower = busqueda.toLowerCase()
      const matchId = incidente.id_incidente.toString().includes(searchLower)
      const matchDesc = incidente.descripcion_problema.toLowerCase().includes(searchLower)
      const matchCliente = `${incidente.clientes?.nombre} ${incidente.clientes?.apellido}`.toLowerCase().includes(searchLower)
      const matchDireccion = `${incidente.inmuebles?.calle} ${incidente.inmuebles?.altura}`.toLowerCase().includes(searchLower)

      if (!matchId && !matchDesc && !matchCliente && !matchDireccion) {
        return false
      }
    }

    return true
  })

  const abrirModal = (id: number) => {
    setIncidenteSeleccionado(id)
    setModalOpen(true)
  }

  const abrirModalGestionar = (incidente: IncidenteConCliente) => {
    setIncidenteParaGestionar(incidente)
    setModalGestionarOpen(true)
  }

  const abrirModalAsignar = (incidente: IncidenteConCliente) => {
    setIncidenteParaAsignar(incidente)
    setModalAsignarOpen(true)
  }

  // Stats
  const totalIncidentes = incidentes.length
  const pendientes = incidentes.filter(i => i.estado_actual === EstadoIncidente.PENDIENTE).length
  const asignacionSolicitada = incidentes.filter(i => i.estado_actual === EstadoIncidente.ASIGNACION_SOLICITADA).length
  const enProceso = incidentes.filter(i => i.estado_actual === EstadoIncidente.EN_PROCESO).length
  const resueltos = incidentes.filter(i => i.estado_actual === EstadoIncidente.FINALIZADO || i.estado_actual === EstadoIncidente.RESUELTO).length

  const renderTablaPendientes = (lista: IncidenteConCliente[]) => {
    if (lista.length === 0) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay incidentes pendientes</p>
        </div>
      )
    }
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Inmueble</TableHead>
              <TableHead>Fecha Ingreso</TableHead>
              <TableHead className="w-[130px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((incidente) => (
              <TableRow
                key={incidente.id_incidente}
                ref={incidente.id_incidente === highlightId ? highlightRef : undefined}
                className={`transition-colors duration-[1800ms] ${incidente.id_incidente === highlightId ? 'bg-amber-100' : 'hover:bg-gray-50'}`}
              >
                <TableCell className="font-medium">#{incidente.id_incidente}</TableCell>
                <TableCell>
                  {incidente.clientes
                    ? `${incidente.clientes.nombre} ${incidente.clientes.apellido}`
                    : '-'}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  {incidente.inmuebles ? (
                    <Link
                      href={`/inmueble/${incidente.id_propiedad}`}
                      className="flex items-center gap-1 text-blue-600 hover:underline truncate"
                    >
                      <span className="truncate">{incidente.inmuebles.calle} {incidente.inmuebles.altura}, {incidente.inmuebles.localidad}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {format(new Date(incidente.fecha_registro), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                </TableCell>
                <TableCell>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => abrirModalGestionar(incidente)}
                    className="gap-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Gestionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const getTecnicoAsignado = (incidente: IncidenteConCliente) => {
    const asig = incidente.asignaciones_tecnico?.find(a => a.estado_asignacion === 'aceptada')
    if (!asig?.tecnicos) return null
    return `${asig.tecnicos.nombre} ${asig.tecnicos.apellido}`
  }

  const getAsignacionActiva = (incidente: IncidenteConCliente) => {
    const asigs = incidente.asignaciones_tecnico ?? []
    return asigs.find(a => a.estado_asignacion === 'pendiente')
      ?? asigs.find(a => a.estado_asignacion === 'rechazada')
      ?? null
  }

  const renderTablaAsignacionSolicitada = (lista: IncidenteConCliente[]) => {
    if (lista.length === 0) {
      return (
        <div className="text-center py-12">
          <Send className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay solicitudes de asignación pendientes</p>
        </div>
      )
    }
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Inmueble</TableHead>
              <TableHead>Técnico solicitado</TableHead>
              <TableHead>Estado solicitud</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-[140px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((incidente) => {
              const asig = getAsignacionActiva(incidente)
              const rechazada = asig?.estado_asignacion === 'rechazada'
              return (
                <TableRow
                  key={incidente.id_incidente}
                  ref={incidente.id_incidente === highlightId ? highlightRef : undefined}
                  className={`transition-colors duration-[1800ms] ${incidente.id_incidente === highlightId ? 'bg-amber-100' : rechazada ? 'bg-red-50 hover:bg-red-50/80' : 'hover:bg-gray-50'}`}
                >
                  <TableCell className="font-medium">#{incidente.id_incidente}</TableCell>
                  <TableCell>
                    {incidente.clientes
                      ? `${incidente.clientes.nombre} ${incidente.clientes.apellido}`
                      : '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {incidente.inmuebles ? (
                      <Link
                        href={`/inmueble/${incidente.id_propiedad}`}
                        className="flex items-center gap-1 text-blue-600 hover:underline truncate"
                      >
                        <span className="truncate">{incidente.inmuebles.calle} {incidente.inmuebles.altura}, {incidente.inmuebles.localidad}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </Link>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {asig?.tecnicos
                      ? `${asig.tecnicos.nombre} ${asig.tecnicos.apellido}`
                      : <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell>
                    {rechazada ? (
                      <Badge className="border-red-200 bg-red-50 text-red-700 gap-1 flex items-center w-fit">
                        <XCircle className="h-3 w-3" />
                        Rechazada
                      </Badge>
                    ) : (
                      <Badge className="border-orange-200 bg-orange-50 text-orange-700 gap-1 flex items-center w-fit">
                        <Clock className="h-3 w-3" />
                        Esperando respuesta
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {format(new Date(incidente.fecha_registro), 'dd/MM/yy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => abrirModalGestionar(incidente)}
                        className={`gap-1 ${rechazada ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        Re-asignar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirModal(incidente.id_incidente)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderTablaIncidentes = (incidentesAMostrar: IncidenteConCliente[], mostrarTecnico = false) => {
    if (incidentesAMostrar.length === 0) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay incidentes en este estado</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Inmueble</TableHead>
              <TableHead>Categoría</TableHead>
              {mostrarTecnico && <TableHead>Técnico</TableHead>}
              <TableHead>Fecha</TableHead>
              <TableHead className="w-[150px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidentesAMostrar.map((incidente) => (
              <TableRow
                key={incidente.id_incidente}
                ref={incidente.id_incidente === highlightId ? highlightRef : undefined}
                className={`transition-colors duration-[1800ms] ${incidente.id_incidente === highlightId ? 'bg-amber-100' : 'hover:bg-gray-50'}`}
              >
                <TableCell className="font-medium">
                  #{incidente.id_incidente}
                </TableCell>
                <TableCell>
                  {incidente.clientes
                    ? `${incidente.clientes.nombre} ${incidente.clientes.apellido}`
                    : '-'}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  {incidente.inmuebles ? (
                    <Link
                      href={`/inmueble/${incidente.id_propiedad}`}
                      className="flex items-center gap-1 text-blue-600 hover:underline truncate"
                    >
                      <span className="truncate">{incidente.inmuebles.calle} {incidente.inmuebles.altura}, {incidente.inmuebles.localidad}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {incidente.categoria || '-'}
                </TableCell>
                {mostrarTecnico && (
                  <TableCell className="text-sm text-gray-700">
                    {getTecnicoAsignado(incidente) ?? <span className="text-gray-400">-</span>}
                  </TableCell>
                )}
                <TableCell className="text-sm text-gray-600">
                  {format(new Date(incidente.fecha_registro), 'dd/MM/yy', { locale: es })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {incidente.estado_actual === 'pendiente' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => abrirModalAsignar(incidente)}
                        className="gap-1"
                      >
                        <Wrench className="h-4 w-4" />
                        Asignar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirModal(incidente.id_incidente)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Incidentes</h1>
        <p className="text-gray-600 mt-1">
          Administra y da seguimiento a todos los incidentes reportados
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendientes}</div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asig. Solicitada</CardTitle>
            <Send className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{asignacionSolicitada}</div>
            <p className="text-xs text-muted-foreground">esperando técnico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{enProceso}</div>
            <p className="text-xs text-muted-foreground">siendo atendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalizados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resueltos}</div>
            <p className="text-xs text-muted-foreground">finalizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncidentes}</div>
            <p className="text-xs text-muted-foreground">incidentes registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por ID, descripción, cliente o dirección..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {estados.map((estado) => (
                  <SelectItem key={estado} value={estado}>{getEstadoIncidenteLabel(estado)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las categorías</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Incidentes por Estado */}
      <div className="space-y-4">
        <Tabs value={tabActiva} onValueChange={setTabActiva} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pendiente" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pendientes
              <Badge variant="secondary" className="ml-2">
                {incidentesFiltrados.filter(i => i.estado_actual === 'pendiente').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="asignacion_solicitada" className="flex items-center gap-1.5">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Asig. Solicitada</span>
              <span className="sm:hidden">Asig.</span>
              {(() => {
                const count = incidentesFiltrados.filter(i => i.estado_actual === 'asignacion_solicitada').length
                const rechazadas = incidentesFiltrados.filter(i =>
                  i.estado_actual === 'asignacion_solicitada' &&
                  (i.asignaciones_tecnico ?? []).some(a => a.estado_asignacion === 'rechazada')
                ).length
                return (
                  <Badge
                    variant="secondary"
                    className={`ml-1 ${rechazadas > 0 ? 'bg-red-100 text-red-700' : ''}`}
                  >
                    {count}
                  </Badge>
                )
              })()}
            </TabsTrigger>
            <TabsTrigger value="en_proceso" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              En Proceso
              <Badge variant="secondary" className="ml-2">
                {incidentesFiltrados.filter(i => i.estado_actual === 'en_proceso').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="resuelto" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Finalizados
              <Badge variant="secondary" className="ml-2">
                {incidentesFiltrados.filter(i => i.estado_actual === 'finalizado' || i.estado_actual === 'resuelto').length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Pendientes */}
          <TabsContent value="pendiente">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Incidentes Pendientes
                </CardTitle>
                <CardDescription>
                  Incidentes sin técnico asignado. Selecciona uno para asignar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTablaPendientes(incidentesFiltrados.filter(i => i.estado_actual === 'pendiente'))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Asignación Solicitada */}
          <TabsContent value="asignacion_solicitada">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-orange-600" />
                  Asignación Solicitada
                </CardTitle>
                <CardDescription>
                  Incidentes con técnico notificado, esperando que acepte o rechace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTablaAsignacionSolicitada(incidentesFiltrados.filter(i => i.estado_actual === 'asignacion_solicitada'))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: En Proceso */}
          <TabsContent value="en_proceso">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  Incidentes en Proceso
                </CardTitle>
                <CardDescription>
                  Incidentes con técnico asignado y en ejecución.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTablaIncidentes(incidentesFiltrados.filter(i => i.estado_actual === 'en_proceso'), true)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Finalizados */}
          <TabsContent value="resuelto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Incidentes Finalizados
                </CardTitle>
                <CardDescription>
                  Incidentes con conformidad aprobada y cerrados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTablaIncidentes(incidentesFiltrados.filter(i => i.estado_actual === 'finalizado' || i.estado_actual === 'resuelto'))}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* Modal de Detalle */}
      <IncidenteDetailModal
        incidenteId={incidenteSeleccionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        rol="admin"
      />

      {/* Modal de Asignación de Técnico */}
      {incidenteParaAsignar && (
        <ModalAsignarTecnico
          open={modalAsignarOpen}
          onOpenChange={setModalAsignarOpen}
          incidente={{
            id_incidente: incidenteParaAsignar.id_incidente,
            descripcion_problema: incidenteParaAsignar.descripcion_problema,
            categoria: incidenteParaAsignar.categoria,

            nombre_cliente: incidenteParaAsignar.clientes?.nombre,
            apellido_cliente: incidenteParaAsignar.clientes?.apellido,
            calle: incidenteParaAsignar.inmuebles?.calle ?? undefined,
            altura: incidenteParaAsignar.inmuebles?.altura ?? undefined,
            localidad: incidenteParaAsignar.inmuebles?.localidad ?? undefined,
          }}
          onAsignarExito={() => { setModalAsignarOpen(false); router.refresh() }}
        />
      )}

      {/* Modal de Gestión de Pendientes */}
      {incidenteParaGestionar && (
        <GestionarPendienteModal
          open={modalGestionarOpen}
          onOpenChange={setModalGestionarOpen}
          incidente={incidenteParaGestionar}
          onGestionExito={() => { setModalGestionarOpen(false); router.refresh() }}
        />
      )}
    </div>
  )
}
