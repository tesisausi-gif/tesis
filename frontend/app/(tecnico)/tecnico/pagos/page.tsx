import { getMisPagosComoTecnico } from '@/features/pagos/pagos-tecnicos.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Clock, CheckCircle2, CreditCard, Building2, Banknote, Wallet } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function fmt$(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
}

function fmtFecha(s: string) {
  return format(new Date(s), "d 'de' MMMM yyyy", { locale: es })
}

const METODO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito', credito: 'Crédito',
}

function MetodoIcon({ metodo }: { metodo: string | null }) {
  const m = metodo?.toLowerCase()
  if (m === 'efectivo') return <Banknote className="h-4 w-4 text-green-600" />
  if (m === 'transferencia') return <Building2 className="h-4 w-4 text-blue-600" />
  if (m === 'debito' || m === 'credito') return <CreditCard className="h-4 w-4 text-purple-600" />
  return <Wallet className="h-4 w-4 text-gray-500" />
}

export default async function TecnicoPagosPage() {
  const { pendientes, recibidos } = await getMisPagosComoTecnico().catch(() => ({ pendientes: [], recibidos: [] }))

  const totalRecibido = recibidos.reduce((s, r) => s + r.monto_pago, 0)
  const totalPendiente = pendientes.reduce((s, p) => s + p.monto_a_recibir, 0)

  return (
    <div className="space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Cobros</h1>
        <p className="text-sm text-gray-500 mt-1">Pagos pendientes y recibidos por tus trabajos</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-4 border-l-amber-400 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500">Pendiente de recibir</p>
            <p className="text-xl font-bold text-amber-600">{fmt$(totalPendiente)}</p>
            <p className="text-xs text-gray-500">{pendientes.length} {pendientes.length === 1 ? 'pago' : 'pagos'}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-400 bg-green-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500">Total recibido</p>
            <p className="text-xl font-bold text-green-600">{fmt$(totalRecibido)}</p>
            <p className="text-xs text-gray-500">{recibidos.length} {recibidos.length === 1 ? 'pago' : 'pagos'}</p>
          </CardContent>
        </Card>
      </div>

      {pendientes.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Pagos pendientes de recibir
          </h2>
          {pendientes.map(p => (
            <Card key={p.id_presupuesto} className="border-2 border-amber-200 bg-amber-50/40">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Incidente #{p.id_incidente}</CardTitle>
                    <CardDescription className="text-sm mt-0.5 line-clamp-2">{p.descripcion_problema}</CardDescription>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 shrink-0">Pendiente</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {p.categoria && <p className="text-xs text-gray-500">Categoría: {p.categoria}</p>}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Materiales</p>
                    <p className="font-medium">{fmt$(p.costo_materiales)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Mano de obra</p>
                    <p className="font-medium">{fmt$(p.costo_mano_obra)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm font-medium text-gray-700">Total a recibir</span>
                  <span className="text-lg font-bold text-amber-600">{fmt$(p.monto_a_recibir)}</span>
                </div>
                <p className="text-xs text-gray-400">Presupuesto del {fmtFecha(p.fecha_presupuesto)}</p>
                <p className="text-xs text-gray-500 bg-white border rounded px-2 py-1.5">
                  La administración coordinará el pago cuando corresponda.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {recibidos.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Historial de pagos recibidos
          </h2>
          {recibidos.map(r => (
            <Card key={r.id_pago_tecnico} className="border-green-200">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Incidente #{r.id_incidente}</CardTitle>
                    {r.descripcion_problema && (
                      <CardDescription className="text-sm mt-0.5 line-clamp-2">{r.descripcion_problema}</CardDescription>
                    )}
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">Recibido</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monto recibido</span>
                  <span className="text-lg font-bold text-green-600">{fmt$(r.monto_pago)}</span>
                </div>
                {r.metodo_pago && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MetodoIcon metodo={r.metodo_pago} />
                    <span>{METODO_LABELS[r.metodo_pago] ?? r.metodo_pago}</span>
                    {r.banco && <span className="text-gray-400">• {r.banco}</span>}
                    {r.cuotas && r.cuotas > 1 && <span className="text-gray-400">• {r.cuotas} cuotas</span>}
                  </div>
                )}
                {r.referencia_pago && (
                  <p className="text-xs text-gray-500">Ref: <span className="font-mono">{r.referencia_pago}</span></p>
                )}
                {r.observaciones && <p className="text-xs text-gray-500 italic">{r.observaciones}</p>}
                <p className="text-xs text-gray-400">Recibido el {fmtFecha(r.fecha_pago)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pendientes.length === 0 && recibidos.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <DollarSign className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">Sin movimientos</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Cuando se apruebe un presupuesto de un trabajo tuyo, los pagos aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
