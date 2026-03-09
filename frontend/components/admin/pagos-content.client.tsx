'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DollarSign, CreditCard, Calendar, FileText, Receipt, Wrench, CheckCircle2, Clock, User } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { TipoPago, MetodoPago } from '@/shared/types/enums'
import { registrarPagoTecnico } from '@/features/pagos/pagos-tecnicos.service'
import type { PendientePagoTecnico, PagoTecnicoRegistrado } from '@/features/pagos/pagos-tecnicos.service'

// ─── Helpers visuales ────────────────────────────────────────────────────────

const AR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const fmt$ = (n: number) => AR.format(n)

const getBadgeTipoPago = (tipo: string) => {
  switch (tipo) {
    case TipoPago.TOTAL: return 'bg-green-100 text-green-800'
    case TipoPago.PARCIAL: return 'bg-blue-100 text-blue-800'
    case TipoPago.ADELANTO: return 'bg-yellow-100 text-yellow-800'
    case TipoPago.REEMBOLSO: return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getMetodoIcon = (metodo: string) => {
  switch (metodo) {
    case MetodoPago.TARJETA: return <CreditCard className="h-4 w-4" />
    case MetodoPago.EFECTIVO: return <DollarSign className="h-4 w-4" />
    case MetodoPago.TRANSFERENCIA: return <Receipt className="h-4 w-4" />
    default: return <FileText className="h-4 w-4" />
  }
}

// ─── Tab Pagos Cliente ────────────────────────────────────────────────────────

interface Pago {
  id_pago: number
  id_incidente: number
  id_presupuesto: number
  monto_pagado: number
  tipo_pago: string
  fecha_pago: string
  metodo_pago: string
  numero_comprobante: string | null
  observaciones: string | null
  fecha_creacion: string
  incidentes?: { id_incidente: number; descripcion_problema: string; categoria: string | null }
  presupuestos?: { id_presupuesto: number; costo_total: number }
}

function TabPagosCliente({ pagos }: { pagos: Pago[] }) {
  const total = pagos.reduce((s, p) => s + p.monto_pagado, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{pagos.length} pagos registrados</p>
        {pagos.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Total recaudado</p>
            <p className="text-xl font-bold text-green-700">{fmt$(total)}</p>
          </div>
        )}
      </div>

      {pagos.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-600">No hay pagos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pagos.map((pago) => (
            <Card key={pago.id_pago} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Pago #{pago.id_pago}
                    </CardTitle>
                    <CardDescription>
                      Incidente #{pago.id_incidente} • Presupuesto #{pago.id_presupuesto}
                      {pago.incidentes?.categoria && <span className="ml-2">• {pago.incidentes.categoria}</span>}
                    </CardDescription>
                  </div>
                  <Badge className={getBadgeTipoPago(pago.tipo_pago)}>{pago.tipo_pago}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Monto</p>
                    <p className="text-xl font-bold text-green-600">{fmt$(pago.monto_pagado)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Método</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      {getMetodoIcon(pago.metodo_pago)}{pago.metodo_pago}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fecha</p>
                    <p className="text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(pago.fecha_pago), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                  {pago.numero_comprobante && (
                    <div>
                      <p className="text-xs text-gray-500">Comprobante</p>
                      <p className="text-sm font-mono">{pago.numero_comprobante}</p>
                    </div>
                  )}
                </div>
                {pago.observaciones && (
                  <p className="text-sm text-gray-600 mt-3 pt-3 border-t">{pago.observaciones}</p>
                )}
                {pago.presupuestos && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Presupuesto total: {fmt$(pago.presupuestos.costo_total)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab Pagos a Técnicos ─────────────────────────────────────────────────────

function TabPagosTecnicos({
  pendientes,
  realizados,
}: {
  pendientes: PendientePagoTecnico[]
  realizados: PagoTecnicoRegistrado[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pagarDialog, setPagarDialog] = useState<PendientePagoTecnico | null>(null)
  const [observaciones, setObservaciones] = useState('')

  const totalPendiente = pendientes.reduce((s, p) => s + p.monto_a_pagar, 0)
  const totalPagado = realizados.reduce((s, p) => s + Number(p.monto_pago), 0)

  const handlePagar = () => {
    if (!pagarDialog) return
    startTransition(async () => {
      const res = await registrarPagoTecnico(
        pagarDialog.id_presupuesto,
        pagarDialog.id_tecnico,
        pagarDialog.id_incidente,
        pagarDialog.monto_a_pagar,
        observaciones.trim() || undefined,
      )
      if (res.success) {
        toast.success('Pago registrado', {
          description: `Se registró el pago de ${fmt$(pagarDialog.monto_a_pagar)} a ${pagarDialog.nombre_tecnico} ${pagarDialog.apellido_tecnico}`,
        })
        setPagarDialog(null)
        setObservaciones('')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al registrar pago')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-amber-700 mb-1">Pendiente de pago a técnicos</p>
            <p className="text-2xl font-bold text-amber-800">{fmt$(totalPendiente)}</p>
            <p className="text-xs text-amber-600 mt-0.5">{pendientes.length} técnico{pendientes.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-green-700 mb-1">Total pagado a técnicos</p>
            <p className="text-2xl font-bold text-green-800">{fmt$(totalPagado)}</p>
            <p className="text-xs text-green-600 mt-0.5">{realizados.length} pago{realizados.length !== 1 ? 's' : ''} registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Pendientes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          Pendientes de pago
        </h3>
        {pendientes.length === 0 ? (
          <Card className="border-dashed border-2 border-green-200">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-400 mb-2" />
              <p className="text-green-700 font-medium">Sin pagos pendientes</p>
              <p className="text-sm text-gray-500">Todos los técnicos han sido pagados</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {pendientes.map((p) => (
              <Card key={p.id_presupuesto} className="border-amber-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="font-semibold text-gray-900">
                          {p.nombre_tecnico} {p.apellido_tecnico}
                        </span>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          Pendiente
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        Incidente #{p.id_incidente} — {p.descripcion_problema}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>Materiales: {fmt$(p.costo_materiales)}</span>
                        <span>Mano de obra: {fmt$(p.costo_mano_obra)}</span>
                        <span className="font-semibold text-gray-700">Total a pagar: {fmt$(p.monto_a_pagar)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { setObservaciones(''); setPagarDialog(p) }}
                      className="bg-green-600 hover:bg-green-700 gap-1 flex-shrink-0"
                      disabled={isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ya se le pagó
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Historial de pagos realizados */}
      {realizados.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Historial de pagos
          </h3>
          <div className="grid gap-3">
            {realizados.map((p) => (
              <Card key={p.id_pago_tecnico} className="border-green-200">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="font-medium text-gray-900">
                          {p.nombre_tecnico} {p.apellido_tecnico}
                        </span>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          Pagado
                        </Badge>
                      </div>
                      {p.descripcion_problema && (
                        <p className="text-sm text-gray-500 truncate">
                          Incidente #{p.id_incidente} — {p.descripcion_problema}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="font-semibold text-green-700">{fmt$(Number(p.monto_pago))}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(p.fecha_pago), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                        {p.marcado_por_nombre && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Marcado por: {p.marcado_por_nombre}
                          </span>
                        )}
                        {!p.marcado_por_nombre && p.marcado_por_email && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {p.marcado_por_email}
                          </span>
                        )}
                      </div>
                      {p.observaciones && (
                        <p className="text-xs text-gray-500 italic">{p.observaciones}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialog: Confirmar pago */}
      <Dialog open={pagarDialog !== null} onOpenChange={(o) => !o && setPagarDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pago al técnico</DialogTitle>
            <DialogDescription>
              Registrá que ya se le entregó el dinero a{' '}
              <strong>{pagarDialog?.nombre_tecnico} {pagarDialog?.apellido_tecnico}</strong>.
              Quedará guardado con tu usuario para trazabilidad.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Incidente</span>
                <span className="font-medium">#{pagarDialog?.id_incidente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Materiales</span>
                <span>{fmt$(pagarDialog?.costo_materiales ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mano de obra</span>
                <span>{fmt$(pagarDialog?.costo_mano_obra ?? 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total a pagar</span>
                <span className="font-bold text-green-700 text-base">{fmt$(pagarDialog?.monto_a_pagar ?? 0)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs-pago">Observaciones (opcional)</Label>
              <Textarea
                id="obs-pago"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Pagado en efectivo en mano, transferencia CBU xxx..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagarDialog(null)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handlePagar} disabled={isPending} className="bg-green-600 hover:bg-green-700 gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {isPending ? 'Registrando...' : 'Confirmar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

interface PagosContentProps {
  pagos: Pago[]
  pendientesTecnicos: PendientePagoTecnico[]
  realizadosTecnicos: PagoTecnicoRegistrado[]
}

export function PagosContent({ pagos, pendientesTecnicos, realizadosTecnicos }: PagosContentProps) {
  return (
    <div className="space-y-4 px-4 py-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
        <p className="text-gray-600 text-sm mt-1">Gestión de cobros y pagos a técnicos</p>
      </div>

      <Tabs defaultValue="clientes">
        <TabsList>
          <TabsTrigger value="clientes" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Cobros a Clientes
          </TabsTrigger>
          <TabsTrigger value="tecnicos" className="gap-2">
            <Wrench className="h-4 w-4" />
            Pagos a Técnicos
            {pendientesTecnicos.length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendientesTecnicos.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-4">
          <TabPagosCliente pagos={pagos} />
        </TabsContent>

        <TabsContent value="tecnicos" className="mt-4">
          <TabPagosTecnicos pendientes={pendientesTecnicos} realizados={realizadosTecnicos} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
