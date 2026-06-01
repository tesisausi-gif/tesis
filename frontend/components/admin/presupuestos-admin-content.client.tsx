'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText, CheckCircle, XCircle, Clock, DollarSign, AlertCircle, Search, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { EstadoPresupuesto } from '@/shared/types/enums'
import { getEstadoPresupuestoColor, getEstadoPresupuestoLabel } from '@/shared/utils/colors'
import { normalizeSearch } from '@/shared/utils'
import { aprobarPresupuesto, rechazarPresupuesto } from '@/features/presupuestos/presupuestos.service'
import type { PresupuestoConDetalle } from '@/features/presupuestos/presupuestos.types'

interface PresupuestosAdminContentProps {
  presupuestos: PresupuestoConDetalle[]
}

export function PresupuestosAdminContent({ presupuestos: initialPresupuestos }: PresupuestosAdminContentProps) {
  const [presupuestos, setPresupuestos] = useState(initialPresupuestos)
  const [loading, setLoading] = useState(false)
  const [modalAprobar, setModalAprobar] = useState<PresupuestoConDetalle | null>(null)
  const [gastosAdmin, setGastosAdmin] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const filtrar = (lista: PresupuestoConDetalle[]) => {
    if (!busqueda.trim()) return lista
    const q = normalizeSearch(busqueda)
    return lista.filter(p =>
      String(p.id_presupuesto).includes(q) ||
      String(p.id_incidente).includes(q) ||
      normalizeSearch(p.descripcion_detallada).includes(q) ||
      normalizeSearch(p.estado_presupuesto).includes(q) ||
      String(p.costo_total).includes(q) ||
      normalizeSearch(p.incidentes?.categoria).includes(q)
    )
  }

  const pendientesAprobacion = filtrar(presupuestos.filter(p => p.estado_presupuesto === EstadoPresupuesto.ENVIADO))

  const handleAprobar = async () => {
    if (!modalAprobar) return
    setLoading(true)
    try {
      const gastos = parseFloat(gastosAdmin) || 0
      const result = await aprobarPresupuesto(modalAprobar.id_presupuesto, gastos)
      if (result.success) {
        toast.success('Presupuesto aprobado', {
          description: 'Se notificó al cliente para su aprobación final',
        })
        setPresupuestos(prev =>
          prev.map(p =>
            p.id_presupuesto === modalAprobar.id_presupuesto
              ? { ...p, estado_presupuesto: EstadoPresupuesto.APROBADO_ADMIN, gastos_administrativos: gastos }
              : p
          )
        )
        setModalAprobar(null)
        setGastosAdmin('')
      } else {
        toast.error('Error', { description: result.error })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRechazar = async (idPresupuesto: number) => {
    setLoading(true)
    try {
      const result = await rechazarPresupuesto(idPresupuesto)
      if (result.success) {
        toast.success('Presupuesto rechazado')
        setPresupuestos(prev =>
          prev.map(p =>
            p.id_presupuesto === idPresupuesto
              ? { ...p, estado_presupuesto: EstadoPresupuesto.RECHAZADO }
              : p
          )
        )
      } else {
        toast.error('Error', { description: result.error })
      }
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return '$0,00'
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
  }

  const renderTabla = (lista: PresupuestoConDetalle[], mostrarAcciones = false) => {
    if (lista.length === 0) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay presupuestos en este estado</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Incidente</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Materiales</TableHead>
              <TableHead>Mano de Obra</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-[80px]"></TableHead>
              {mostrarAcciones && <TableHead className="w-[160px]">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((p) => (
              <TableRow key={p.id_presupuesto} className="hover:bg-gray-50">
                <TableCell className="font-medium">#{p.id_presupuesto}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">#{p.id_incidente}</p>
                    {p.incidentes?.categoria && (
                      <p className="text-xs text-gray-500">{p.incidentes.categoria}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="text-sm truncate">{p.descripcion_detallada}</p>
                </TableCell>
                <TableCell className="text-sm">{formatCurrency(p.costo_materiales)}</TableCell>
                <TableCell className="text-sm">{formatCurrency(p.costo_mano_obra)}</TableCell>
                <TableCell>
                  <span className="font-semibold text-blue-600">{formatCurrency(p.costo_total)}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getEstadoPresupuestoColor(p.estado_presupuesto ?? '')}>
                    {getEstadoPresupuestoLabel(p.estado_presupuesto ?? '')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {p.fecha_creacion ? format(new Date(p.fecha_creacion), 'dd/MM/yy', { locale: es }) : ''}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/incidentes?highlight=${p.id_incidente}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver
                  </Link>
                </TableCell>
                {mostrarAcciones && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 gap-1"
                        disabled={loading}
                        onClick={() => { setModalAprobar(p); setGastosAdmin('') }}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={loading}
                        onClick={() => handleRechazar(p.id_presupuesto)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Presupuestos</h1>
        <p className="text-gray-600 mt-1">Gestión y aprobación de presupuestos de incidentes</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-slate-400 bg-gradient-to-br from-white to-slate-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total</CardTitle>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl font-bold tabular-nums text-slate-700">{presupuestos.length}</div>
            <p className="text-xs text-slate-400 mt-1">presupuestos registrados</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">Por aprobar</CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl font-bold tabular-nums text-amber-700">{pendientesAprobacion.length}</div>
            <p className="text-xs text-slate-400 mt-1">esperan revisión</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-white to-green-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">Aprobados</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl font-bold tabular-nums text-green-700">
              {presupuestos.filter(p => p.estado_presupuesto === EstadoPresupuesto.APROBADO).length}
            </div>
            <p className="text-xs text-slate-400 mt-1">finalizados</p>
          </CardContent>
        </Card>
      </div>

      {/* Buscador global */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por ID, incidente, descripción, estado, categoría..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      <Tabs defaultValue={pendientesAprobacion.length > 0 ? 'por_aprobar' : 'todos'}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="por_aprobar" className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold h-auto data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Por aprobar
            {pendientesAprobacion.length > 0 && (
              <span className="ml-0.5 text-[10px] font-bold rounded-full px-1.5 py-px bg-amber-100 text-amber-700">
                {pendientesAprobacion.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="todos" className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold h-auto data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            Todos
            <span className="ml-0.5 text-[10px] font-bold rounded-full px-1.5 py-px bg-slate-200/60 text-slate-400">{presupuestos.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="por_aprobar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Presupuestos Enviados por Técnicos
              </CardTitle>
              <CardDescription>
                Revisá y aprobá (o rechazá) los presupuestos enviados. Al aprobar podés agregar gastos administrativos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTabla(pendientesAprobacion, true)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Todos los Presupuestos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderTabla(filtrar(presupuestos))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal aprobar con gastos administrativos */}
      <Dialog open={!!modalAprobar} onOpenChange={(open) => { if (!open) setModalAprobar(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Presupuesto #{modalAprobar?.id_presupuesto}</DialogTitle>
            <DialogDescription>
              Podés agregar gastos administrativos antes de enviar al cliente para aprobación final.
            </DialogDescription>
          </DialogHeader>

          {modalAprobar && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Materiales:</span>
                  <span>{formatCurrency(modalAprobar.costo_materiales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mano de obra:</span>
                  <span>{formatCurrency(modalAprobar.costo_mano_obra)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gastos">Gastos administrativos (opcional)</Label>
                <Input
                  id="gastos"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={gastosAdmin}
                  onChange={(e) => setGastosAdmin(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center font-semibold text-base border-t pt-3">
                <span>Total resultante:</span>
                <span className="text-blue-600">
                  {formatCurrency(
                    (modalAprobar.costo_materiales || 0) +
                    (modalAprobar.costo_mano_obra || 0) +
                    (parseFloat(gastosAdmin) || 0)
                  )}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setModalAprobar(null)} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                  onClick={handleAprobar}
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading ? 'Aprobando...' : 'Confirmar aprobación'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
