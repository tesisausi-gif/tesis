'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DollarSign, CreditCard, Calendar, FileText, Receipt, Wrench,
  CheckCircle2, Clock, User, Banknote, ArrowLeftRight, History, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { registrarPagoTecnico } from '@/features/pagos/pagos-tecnicos.service'
import { registrarCobroCliente } from '@/features/pagos/cobros-clientes.service'
import type { PendientePagoTecnico, PagoTecnicoRegistrado } from '@/features/pagos/pagos-tecnicos.service'
import type { PendienteCobroCliente, CobroClienteRegistrado } from '@/features/pagos/cobros-clientes.service'
import { getTimelineIncidente } from '@/features/incidentes/incidentes.service'
import type { EventoTimeline } from '@/features/incidentes/incidentes.service'

const AR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const fmt$ = (n: number) => AR.format(n)

type MetodoPagoType = 'efectivo' | 'transferencia' | 'debito' | 'credito'

const METODOS: { value: MetodoPagoType; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
]

function metodoLabel(m: string) {
  return METODOS.find(x => x.value === m)?.label ?? m
}

interface MetodoPagoData {
  metodo: MetodoPagoType | ''
  cbuAlias: string
  referencia: string
  banco: string
  ultimos4: string
  cuotas: string
  observaciones: string
}

const METODO_INICIAL: MetodoPagoData = {
  metodo: '', cbuAlias: '', referencia: '', banco: '', ultimos4: '', cuotas: '1', observaciones: '',
}

function MetodoPagoForm({ data, onChange }: { data: MetodoPagoData; onChange: (d: MetodoPagoData) => void }) {
  const set = (k: keyof MetodoPagoData, v: string) => onChange({ ...data, [k]: v })
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs mb-2 block">Método de pago *</Label>
        <div className="grid grid-cols-2 gap-2">
          {METODOS.map(m => (
            <button key={m.value} type="button" onClick={() => set('metodo', m.value)}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${data.metodo === m.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
              {m.value === 'efectivo' && <Banknote className="h-4 w-4" />}
              {m.value === 'transferencia' && <ArrowLeftRight className="h-4 w-4" />}
              {(m.value === 'debito' || m.value === 'credito') && <CreditCard className="h-4 w-4" />}
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {data.metodo === 'transferencia' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs">CBU / Alias *</Label>
            <Input value={data.cbuAlias} onChange={e => set('cbuAlias', e.target.value)} placeholder="CBU o alias de la cuenta" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Banco</Label>
            <Input value={data.banco} onChange={e => set('banco', e.target.value)} placeholder="Ej: Banco Nación" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Referencia / Comprobante (opcional)</Label>
            <Input value={data.referencia} onChange={e => set('referencia', e.target.value)} placeholder="Nro. de operación" className="h-8 text-sm" />
          </div>
        </div>
      )}
      {(data.metodo === 'debito' || data.metodo === 'credito') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs">Últimos 4 dígitos *</Label>
            <Input value={data.ultimos4} onChange={e => set('ultimos4', e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="0000" maxLength={4} className="h-8 text-sm w-24" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Banco emisor *</Label>
            <Input value={data.banco} onChange={e => set('banco', e.target.value)} placeholder="Ej: Galicia, BBVA..." className="h-8 text-sm" />
          </div>
          {data.metodo === 'credito' && (
            <div className="space-y-1">
              <Label className="text-xs">Cuotas</Label>
              <Select value={data.cuotas} onValueChange={v => set('cuotas', v)}>
                <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,6,9,12,18,24].map(c => <SelectItem key={c} value={String(c)}>{c === 1 ? 'Pago único' : `${c} cuotas`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Observaciones (opcional)</Label>
        <Textarea value={data.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Notas adicionales..." rows={2} className="text-sm" />
      </div>
    </div>
  )
}

function validarMetodoPago(d: MetodoPagoData): string | null {
  if (!d.metodo) return 'Seleccioná un método de pago'
  if (d.metodo === 'transferencia' && !d.cbuAlias.trim()) return 'El CBU/Alias es requerido'
  if ((d.metodo === 'debito' || d.metodo === 'credito') && d.ultimos4.length !== 4) return 'Ingresá los últimos 4 dígitos de la tarjeta'
  if ((d.metodo === 'debito' || d.metodo === 'credito') && !d.banco.trim()) return 'El banco emisor es requerido'
  return null
}

function MetodoBadge({ metodo }: { metodo: string }) {
  const colors: Record<string,string> = {
    efectivo: 'bg-green-100 text-green-800', transferencia: 'bg-blue-100 text-blue-800',
    debito: 'bg-purple-100 text-purple-800', credito: 'bg-orange-100 text-orange-800',
  }
  return <Badge className={colors[metodo] ?? 'bg-gray-100 text-gray-700'}>{metodoLabel(metodo)}</Badge>
}

function TabCobrosClientes({ pendientes, realizados }: { pendientes: PendienteCobroCliente[]; realizados: CobroClienteRegistrado[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cobrarDialog, setCobrarDialog] = useState<PendienteCobroCliente | null>(null)
  const [formPago, setFormPago] = useState<MetodoPagoData>(METODO_INICIAL)

  const totalPendiente = pendientes.reduce((s,p) => s + p.monto_cobro, 0)
  const totalCobrado = realizados.reduce((s,c) => s + Number(c.monto_cobro), 0)

  const handleCobrar = () => {
    const err = validarMetodoPago(formPago)
    if (err) { toast.error(err); return }
    if (!cobrarDialog) return
    startTransition(async () => {
      const res = await registrarCobroCliente({
        idPresupuesto: cobrarDialog.id_presupuesto,
        idIncidente: cobrarDialog.id_incidente,
        idCliente: cobrarDialog.id_cliente,
        montoCobro: cobrarDialog.monto_cobro,
        metodoPago: formPago.metodo,
        referenciaPago: formPago.metodo === 'transferencia'
          ? [formPago.cbuAlias, formPago.referencia].filter(Boolean).join(' / ')
          : (formPago.metodo === 'debito' || formPago.metodo === 'credito') ? formPago.ultimos4 : undefined,
        banco: formPago.banco || undefined,
        cuotas: formPago.metodo === 'credito' ? parseInt(formPago.cuotas) : undefined,
        observaciones: formPago.observaciones || undefined,
      })
      if (res.success) {
        toast.success('Cobro registrado', { description: `${fmt$(cobrarDialog.monto_cobro)} — ${metodoLabel(formPago.metodo)}` })
        setCobrarDialog(null); setFormPago(METODO_INICIAL); router.refresh()
      } else { toast.error(res.error ?? 'Error al registrar cobro') }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-amber-200 bg-amber-50"><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-amber-700 mb-1">Pendiente de cobro</p>
          <p className="text-2xl font-bold text-amber-800">{fmt$(totalPendiente)}</p>
          <p className="text-xs text-amber-600 mt-0.5">{pendientes.length} cliente{pendientes.length!==1?'s':''}</p>
        </CardContent></Card>
        <Card className="border-green-200 bg-green-50"><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-green-700 mb-1">Total cobrado</p>
          <p className="text-2xl font-bold text-green-800">{fmt$(totalCobrado)}</p>
          <p className="text-xs text-green-600 mt-0.5">{realizados.length} cobro{realizados.length!==1?'s':''}</p>
        </CardContent></Card>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500"/>Pendientes de cobro</h3>
        {pendientes.length === 0 ? (
          <Card className="border-dashed border-2 border-green-200"><CardContent className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-400 mb-2"/>
            <p className="text-green-700 font-medium">Sin cobros pendientes</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {pendientes.map(p => (
              <Card key={p.id_presupuesto} className="border-amber-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600 flex-shrink-0"/>
                        <span className="font-semibold">{p.nombre_cliente} {p.apellido_cliente}</span>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Pendiente</Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">Incidente #{p.id_incidente} — {p.descripcion_problema}</p>
                      <p className="text-sm font-bold text-gray-800">Total (con comisión): {fmt$(p.monto_cobro)}</p>
                    </div>
                    <Button size="sm" onClick={() => { setFormPago(METODO_INICIAL); setCobrarDialog(p) }}
                      className="bg-green-600 hover:bg-green-700 gap-1 flex-shrink-0" disabled={isPending}>
                      <DollarSign className="h-3.5 w-3.5"/>Cobrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {realizados.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500"/>Historial de cobros</h3>
          <div className="grid gap-3">
            {realizados.map(c => (
              <Card key={c.id_cobro} className="border-green-200"><CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <User className="h-4 w-4 text-blue-600 flex-shrink-0"/>
                  <span className="font-medium">{c.nombre_cliente} {c.apellido_cliente}</span>
                  <MetodoBadge metodo={c.metodo_pago}/>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Cobrado</Badge>
                </div>
                {c.descripcion_problema && <p className="text-sm text-gray-500 truncate">Incidente #{c.id_incidente} — {c.descripcion_problema}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                  <span className="font-semibold text-green-700">{fmt$(Number(c.monto_cobro))}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>{format(new Date(c.fecha_cobro),'dd/MM/yyyy HH:mm',{locale:es})}</span>
                  {c.referencia_pago && <span>Ref: {c.referencia_pago}</span>}
                  {c.banco && <span>{c.banco}</span>}
                  {c.cuotas && c.cuotas > 1 && <span>{c.cuotas} cuotas</span>}
                  {c.marcado_por_nombre && <span className="flex items-center gap-1"><User className="h-3 w-3"/>Cobrado por: {c.marcado_por_nombre}</span>}
                  {!c.marcado_por_nombre && c.marcado_por_email && <span>{c.marcado_por_email}</span>}
                </div>
                {c.observaciones && <p className="text-xs text-gray-400 italic mt-1">{c.observaciones}</p>}
              </CardContent></Card>
            ))}
          </div>
        </div>
      )}
      <Dialog open={cobrarDialog !== null} onOpenChange={o => !o && setCobrarDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar cobro al cliente</DialogTitle>
            <DialogDescription>
              Registrá el cobro de <strong>{fmt$(cobrarDialog?.monto_cobro ?? 0)}</strong> a{' '}
              <strong>{cobrarDialog?.nombre_cliente} {cobrarDialog?.apellido_cliente}</strong>.
            </DialogDescription>
          </DialogHeader>
          <MetodoPagoForm data={formPago} onChange={setFormPago}/>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCobrarDialog(null)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleCobrar} disabled={isPending || !formPago.metodo} className="bg-green-600 hover:bg-green-700 gap-2">
              <CheckCircle2 className="h-4 w-4"/>{isPending ? 'Registrando...' : 'Confirmar cobro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TabPagosTecnicos({ pendientes, realizados }: { pendientes: PendientePagoTecnico[]; realizados: PagoTecnicoRegistrado[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pagarDialog, setPagarDialog] = useState<PendientePagoTecnico | null>(null)
  const [formPago, setFormPago] = useState<MetodoPagoData>(METODO_INICIAL)

  // Estado para timeline
  const [timeline, setTimeline] = useState<EventoTimeline[] | null>(null)
  const [cargandoTimeline, setCargandoTimeline] = useState(false)
  const [timelineDialogId, setTimelineDialogId] = useState<number | null>(null)

  const totalPendiente = pendientes.reduce((s,p) => s + p.monto_a_pagar, 0)
  const totalPagado = realizados.reduce((s,p) => s + Number(p.monto_pago), 0)

  const handlePagar = () => {
    const err = validarMetodoPago(formPago)
    if (err) { toast.error(err); return }
    if (!pagarDialog) return
    startTransition(async () => {
      const res = await registrarPagoTecnico(
        pagarDialog.id_presupuesto, pagarDialog.id_tecnico, pagarDialog.id_incidente, pagarDialog.monto_a_pagar,
        formPago.metodo,
        formPago.metodo === 'transferencia' ? [formPago.cbuAlias, formPago.referencia].filter(Boolean).join(' / ')
          : (formPago.metodo === 'debito' || formPago.metodo === 'credito') ? formPago.ultimos4 : undefined,
        formPago.banco || undefined,
        formPago.metodo === 'credito' ? parseInt(formPago.cuotas) : undefined,
        formPago.observaciones || undefined,
      )
      if (res.success) {
        toast.success('Pago registrado', { description: `${fmt$(pagarDialog.monto_a_pagar)} a ${pagarDialog.nombre_tecnico} — ${metodoLabel(formPago.metodo)}` })
        setPagarDialog(null)
        setFormPago(METODO_INICIAL)
        router.refresh()
      } else { toast.error(res.error ?? 'Error al registrar pago') }
    })
  }

  const abrirTimeline = async (idIncidente: number) => {
    setTimelineDialogId(idIncidente)
    setCargandoTimeline(true)
    try {
      const data = await getTimelineIncidente(idIncidente)
      setTimeline(data)
    } catch { toast.error('Error al cargar timeline') }
    finally { setCargandoTimeline(false) }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-amber-200 bg-amber-50"><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-amber-700 mb-1">Pendiente de pago</p>
          <p className="text-2xl font-bold text-amber-800">{fmt$(totalPendiente)}</p>
          <p className="text-xs text-amber-600 mt-0.5">{pendientes.length} técnico{pendientes.length!==1?'s':''}</p>
        </CardContent></Card>
        <Card className="border-green-200 bg-green-50"><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-green-700 mb-1">Total pagado</p>
          <p className="text-2xl font-bold text-green-800">{fmt$(totalPagado)}</p>
          <p className="text-xs text-green-600 mt-0.5">{realizados.length} pago{realizados.length!==1?'s':''}</p>
        </CardContent></Card>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500"/>Pendientes</h3>
        {pendientes.length === 0 ? (
          <Card className="border-dashed border-2 border-green-200"><CardContent className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-400 mb-2"/>
            <p className="text-green-700 font-medium">Sin pagos pendientes</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {pendientes.map(p => (
              <Card key={p.id_presupuesto} className="border-amber-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-blue-600 flex-shrink-0"/>
                        <span className="font-semibold">{p.nombre_tecnico} {p.apellido_tecnico}</span>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Pendiente</Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">Incidente #{p.id_incidente} — {p.descripcion_problema}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>Materiales: {fmt$(p.costo_materiales)}</span>
                        <span>Mano de obra: {fmt$(p.costo_mano_obra)}</span>
                        <span className="font-semibold text-gray-700">Total: {fmt$(p.monto_a_pagar)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => abrirTimeline(p.id_incidente)} disabled={isPending} className="gap-1 flex-shrink-0">
                        <History className="h-3.5 w-3.5"/>Historial
                      </Button>
                      <Button size="sm" onClick={() => { setFormPago(METODO_INICIAL); setPagarDialog(p) }}
                        className="bg-green-600 hover:bg-green-700 gap-1 flex-shrink-0" disabled={isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5"/>Ya se le pagó
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {realizados.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500"/>Historial</h3>
          <div className="grid gap-3">
            {realizados.map(p => (
              <Card key={p.id_pago_tecnico} className="border-green-200"><CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Wrench className="h-4 w-4 text-blue-600 flex-shrink-0"/>
                  <span className="font-medium">{p.nombre_tecnico} {p.apellido_tecnico}</span>
                  {p.metodo_pago && <MetodoBadge metodo={p.metodo_pago}/>}
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Pagado</Badge>
                </div>
                {p.descripcion_problema && <p className="text-sm text-gray-500 truncate">Incidente #{p.id_incidente} — {p.descripcion_problema}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                  <span className="font-semibold text-green-700">{fmt$(Number(p.monto_pago))}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>{format(new Date(p.fecha_pago),'dd/MM/yyyy HH:mm',{locale:es})}</span>
                  {p.referencia_pago && <span>Ref: {p.referencia_pago}</span>}
                  {p.banco && <span>{p.banco}</span>}
                  {p.cuotas && p.cuotas > 1 && <span>{p.cuotas} cuotas</span>}
                  {p.marcado_por_nombre && <span className="flex items-center gap-1"><User className="h-3 w-3"/>Pagado por: {p.marcado_por_nombre}</span>}
                  {!p.marcado_por_nombre && p.marcado_por_email && <span>{p.marcado_por_email}</span>}
                </div>
                {p.observaciones && <p className="text-xs text-gray-400 italic mt-1">{p.observaciones}</p>}
              </CardContent></Card>
            ))}
          </div>
        </div>
      )}
      <Dialog open={pagarDialog !== null} onOpenChange={o => !o && setPagarDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pago al técnico</DialogTitle>
            <DialogDescription>
              Registrá el pago de <strong>{fmt$(pagarDialog?.monto_a_pagar ?? 0)}</strong> a{' '}
              <strong>{pagarDialog?.nombre_tecnico} {pagarDialog?.apellido_tecnico}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-600">Materiales</span><span>{fmt$(pagarDialog?.costo_materiales??0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Mano de obra</span><span>{fmt$(pagarDialog?.costo_mano_obra??0)}</span></div>
              <div className="flex justify-between border-t pt-1"><span className="font-semibold">Total</span><span className="font-bold text-green-700">{fmt$(pagarDialog?.monto_a_pagar??0)}</span></div>
            </div>
            {pagarDialog?.url_comprobante_compras && (
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Comprobante de compras del técnico</p>
                <a href={pagarDialog.url_comprobante_compras} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={pagarDialog.url_comprobante_compras}
                    alt="Comprobante de compras"
                    className="max-h-48 w-full object-contain rounded-md border bg-gray-50"
                  />
                </a>
                <p className="text-xs text-blue-600 underline text-center">
                  <a href={pagarDialog.url_comprobante_compras} target="_blank" rel="noopener noreferrer">Ver en tamaño completo</a>
                </p>
              </div>
            )}
            <MetodoPagoForm data={formPago} onChange={setFormPago}/>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagarDialog(null)} disabled={isPending}>Cancelar</Button>
            <Button onClick={handlePagar} disabled={isPending || !formPago.metodo} className="bg-green-600 hover:bg-green-700 gap-2">
              <CheckCircle2 className="h-4 w-4"/>{isPending ? 'Registrando...' : 'Confirmar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de timeline */}
      <Dialog open={timelineDialogId !== null} onOpenChange={o => !o && setTimelineDialogId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial del Incidente #{timelineDialogId}</DialogTitle>
            <DialogDescription>Línea de tiempo del proceso completo</DialogDescription>
          </DialogHeader>
          {cargandoTimeline ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="relative pl-6 space-y-4 mt-2">
              {(timeline || []).map((ev, i) => {
                const colores: Record<string, string> = {
                  registro: 'bg-blue-500', asignacion: 'bg-purple-500',
                  presupuesto: 'bg-amber-500', conformidad: 'bg-cyan-500',
                  pago: 'bg-green-500', calificacion: 'bg-yellow-500',
                }
                return (
                  <div key={i} className="relative">
                    <div className={`absolute -left-6 top-1 h-3 w-3 rounded-full ${colores[ev.tipo] ?? 'bg-gray-400'}`} />
                    {i < (timeline?.length ?? 0) - 1 && <div className="absolute -left-[19px] top-4 h-full w-0.5 bg-gray-200" />}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">{new Date(ev.fecha).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      <p className="text-sm font-semibold text-gray-800">{ev.titulo}</p>
                      <p className="text-xs text-gray-500">{ev.descripcion}</p>
                    </div>
                  </div>
                )
              })}
              {(!timeline || timeline.length === 0) && <p className="text-center text-sm text-gray-400 py-4">Sin eventos registrados</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TabRegistroHistorico({ realizadosTecnicos, realizadosCobroCliente }: { realizadosTecnicos: PagoTecnicoRegistrado[]; realizadosCobroCliente: CobroClienteRegistrado[] }) {
  type RegistroItem =
    | { tipo: 'tecnico'; fecha: string; item: PagoTecnicoRegistrado }
    | { tipo: 'cliente'; fecha: string; item: CobroClienteRegistrado }

  const items: RegistroItem[] = [
    ...realizadosTecnicos.map(p => ({ tipo: 'tecnico' as const, fecha: p.fecha_pago, item: p })),
    ...realizadosCobroCliente.map(c => ({ tipo: 'cliente' as const, fecha: c.fecha_cobro, item: c })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  if (items.length === 0) {
    return (
      <Card className="border-dashed border-2"><CardContent className="flex flex-col items-center py-12 text-center">
        <Receipt className="h-12 w-12 text-gray-300 mb-3"/>
        <p className="text-gray-600">No hay pagos en el registro histórico</p>
      </CardContent></Card>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((entry, i) => {
        if (entry.tipo === 'tecnico') {
          const p = entry.item
          return (
            <Card key={`t-${p.id_pago_tecnico ?? i}`} className="border-blue-100">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Wrench className="h-4 w-4 text-blue-600 flex-shrink-0"/>
                  <span className="font-medium text-sm">{p.nombre_tecnico} {p.apellido_tecnico}</span>
                  {p.metodo_pago && <MetodoBadge metodo={p.metodo_pago}/>}
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Pago técnico</Badge>
                </div>
                {p.descripcion_problema && <p className="text-xs text-gray-500 truncate mb-1">Incidente #{p.id_incidente} — {p.descripcion_problema}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="font-semibold text-blue-700">{fmt$(Number(p.monto_pago))}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>{format(new Date(p.fecha_pago),'dd/MM/yyyy HH:mm',{locale:es})}</span>
                  {p.referencia_pago && <span>Ref: {p.referencia_pago}</span>}
                  {p.banco && <span>{p.banco}</span>}
                  {(p.marcado_por_nombre || p.marcado_por_email) && <span className="flex items-center gap-1"><User className="h-3 w-3"/>Por: {p.marcado_por_nombre ?? p.marcado_por_email}</span>}
                </div>
                {p.observaciones && <p className="text-xs text-gray-400 italic mt-1">{p.observaciones}</p>}
              </CardContent>
            </Card>
          )
        } else {
          const c = entry.item
          return (
            <Card key={`c-${c.id_cobro ?? i}`} className="border-green-100">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <User className="h-4 w-4 text-green-600 flex-shrink-0"/>
                  <span className="font-medium text-sm">{c.nombre_cliente} {c.apellido_cliente}</span>
                  <MetodoBadge metodo={c.metodo_pago}/>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Cobro cliente</Badge>
                </div>
                {c.descripcion_problema && <p className="text-xs text-gray-500 truncate mb-1">Incidente #{c.id_incidente} — {c.descripcion_problema}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="font-semibold text-green-700">{fmt$(Number(c.monto_cobro))}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>{format(new Date(c.fecha_cobro),'dd/MM/yyyy HH:mm',{locale:es})}</span>
                  {c.referencia_pago && <span>Ref: {c.referencia_pago}</span>}
                  {c.banco && <span>{c.banco}</span>}
                  {(c.marcado_por_nombre || c.marcado_por_email) && <span className="flex items-center gap-1"><User className="h-3 w-3"/>Por: {c.marcado_por_nombre ?? c.marcado_por_email}</span>}
                </div>
                {c.observaciones && <p className="text-xs text-gray-400 italic mt-1">{c.observaciones}</p>}
              </CardContent>
            </Card>
          )
        }
      })}
    </div>
  )
}

interface PagosContentProps {
  pagos: unknown[]
  pendientesTecnicos: PendientePagoTecnico[]
  realizadosTecnicos: PagoTecnicoRegistrado[]
  pendientesCobroCliente: PendienteCobroCliente[]
  realizadosCobroCliente: CobroClienteRegistrado[]
}

export function PagosContent({ pendientesTecnicos, realizadosTecnicos, pendientesCobroCliente, realizadosCobroCliente }: PagosContentProps) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('pagos-admin-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobros_clientes' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_tecnicos' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presupuestos' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="space-y-4 px-4 py-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pagos y Cobros</h1>
        <p className="text-gray-600 text-sm mt-1">Gestión de cobros a clientes y pagos a técnicos</p>
      </div>
      <Tabs defaultValue="cobros-clientes">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="cobros-clientes" className="gap-1.5">
            <DollarSign className="h-4 w-4"/>Cobros a Clientes
            {pendientesCobroCliente.length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendientesCobroCliente.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pagos-tecnicos" className="gap-1.5">
            <Wrench className="h-4 w-4"/>Pagos a Técnicos
            {pendientesTecnicos.length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendientesTecnicos.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="registro" className="gap-1.5">
            <FileText className="h-4 w-4"/>Registro histórico
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cobros-clientes" className="mt-4">
          <TabCobrosClientes pendientes={pendientesCobroCliente} realizados={realizadosCobroCliente}/>
        </TabsContent>
        <TabsContent value="pagos-tecnicos" className="mt-4">
          <TabPagosTecnicos pendientes={pendientesTecnicos} realizados={realizadosTecnicos}/>
        </TabsContent>
        <TabsContent value="registro" className="mt-4">
          <TabRegistroHistorico realizadosTecnicos={realizadosTecnicos} realizadosCobroCliente={realizadosCobroCliente}/>
        </TabsContent>
      </Tabs>
    </div>
  )
}
