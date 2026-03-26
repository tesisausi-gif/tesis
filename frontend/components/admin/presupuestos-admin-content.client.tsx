'use client'

import { useState } from 'react'
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
import { FileText, CheckCircle, XCircle, Clock, DollarSign, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { EstadoPresupuesto } from '@/shared/types/enums'
import { getEstadoPresupuestoColor, getEstadoPresupuestoLabel } from '@/shared/utils/colors'
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

  const pendientesAprobacion = presupuestos.filter(p => p.estado_presupuesto === EstadoPresupuesto.ENVIADO)

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
                  {format(new Date(p.fecha_creacion!), 'dd/MM/yy', { locale: es })}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presupuestos.length}</div>
            <p className="text-xs text-muted-foreground">presupuestos registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por aprobar</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendientesAprobacion.length}</div>
            <p className="text-xs text-muted-foreground">esperan revisión</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {presupuestos.filter(p => p.estado_presupuesto === EstadoPresupuesto.APROBADO).length}
            </div>
            <p className="text-xs text-muted-foreground">finalizados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={pendientesAprobacion.length > 0 ? 'por_aprobar' : 'todos'}>
        <TabsList>
          <TabsTrigger value="por_aprobar" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Por aprobar
            {pendientesAprobacion.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800">
                {pendientesAprobacion.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="todos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Todos
            <Badge variant="secondary" className="ml-1">{presupuestos.length}</Badge>
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
              {renderTabla(presupuestos)}
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
