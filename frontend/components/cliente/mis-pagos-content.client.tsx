'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Paginacion } from '@/components/ui/paginacion'
import { normalizeSearch } from '@/shared/utils'
import {
  DollarSign, Clock, CheckCircle2, CreditCard, Building2, Banknote, Wallet,
  Search, X, Calendar, MapPin, FileText,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { MiCobroPendiente, MiCobroRealizado } from '@/features/pagos/cobros-clientes.service'

const fmt$ = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const fmtFecha = (s: string) => format(new Date(s), "d 'de' MMM yyyy", { locale: es })

const METODO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito', credito: 'Crédito',
}

function MetodoIcon({ metodo, className = 'h-3.5 w-3.5' }: { metodo: string; className?: string }) {
  const m = metodo?.toLowerCase()
  if (m === 'efectivo') return <Banknote className={`${className} text-green-600`} />
  if (m === 'transferencia') return <Building2 className={`${className} text-blue-600`} />
  if (m === 'debito' || m === 'credito') return <CreditCard className={`${className} text-purple-600`} />
  return <Wallet className={`${className} text-gray-500`} />
}

interface Props {
  pendientes: MiCobroPendiente[]
  realizados: MiCobroRealizado[]
}

const POR_PAGINA = 6

export function MisPagosContent({ pendientes, realizados }: Props) {
  // ── Filtros ────────────────────────────────────────────────────────────────
  const [busqueda, setBusqueda]       = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'pagado'>('todos')
  const [filtroInmueble, setFiltroInmueble] = useState<string>('todos')
  const [filtroMonto, setFiltroMonto] = useState<'todos' | 'lt5k' | '5to20k' | '20to50k' | 'gt50k'>('todos')
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos')
  const [paginaPend, setPaginaPend] = useState(1)
  const [paginaPag,  setPaginaPag]  = useState(1)

  // ── Métricas (sobre totales completos, no filtrados) ────────────────────────
  const totalPagado    = realizados.reduce((s, r) => s + r.monto_cobro, 0)
  const totalPendiente = pendientes.reduce((s, p) => s + p.monto_a_pagar, 0)

  // ── Inmuebles únicos para el dropdown ───────────────────────────────────────
  const inmueblesUnicos = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of pendientes) {
      if (p.id_inmueble && p.direccion_inmueble) map.set(p.id_inmueble, p.direccion_inmueble)
    }
    for (const r of realizados) {
      if (r.id_inmueble && r.direccion_inmueble) map.set(r.id_inmueble, r.direccion_inmueble)
    }
    return Array.from(map.entries()).map(([id, dir]) => ({ id, direccion: dir }))
  }, [pendientes, realizados])

  // ── Métodos de pago únicos para el dropdown ─────────────────────────────────
  const metodosUnicos = useMemo(() => {
    const set = new Set<string>()
    for (const r of realizados) if (r.metodo_pago) set.add(r.metodo_pago)
    return Array.from(set)
  }, [realizados])

  // ── Helper: ¿el ítem cumple los filtros activos? ────────────────────────────
  const cumpleMonto = (monto: number) => {
    switch (filtroMonto) {
      case 'lt5k':    return monto < 5000
      case '5to20k':  return monto >= 5000 && monto < 20000
      case '20to50k': return monto >= 20000 && monto < 50000
      case 'gt50k':   return monto >= 50000
      default:        return true
    }
  }

  const q = normalizeSearch(busqueda)
  const matchBusqueda = (texto: string, idIncidente: number, monto: number) =>
    !q ||
    normalizeSearch(texto).includes(q) ||
    String(idIncidente).includes(q) ||
    String(Math.round(monto)).includes(q)

  // ── Aplicar filtros ─────────────────────────────────────────────────────────
  const pendientesFiltrados = pendientes.filter(p => {
    if (filtroEstado === 'pagado') return false
    if (filtroInmueble !== 'todos' && String(p.id_inmueble) !== filtroInmueble) return false
    if (!cumpleMonto(p.monto_a_pagar)) return false
    if (filtroMetodo !== 'todos') return false // los pendientes no tienen método aún
    return matchBusqueda(`${p.descripcion_problema} ${p.direccion_inmueble ?? ''}`, p.id_incidente, p.monto_a_pagar)
  })

  const realizadosFiltrados = realizados.filter(r => {
    if (filtroEstado === 'pendiente') return false
    if (filtroInmueble !== 'todos' && String(r.id_inmueble) !== filtroInmueble) return false
    if (!cumpleMonto(r.monto_cobro)) return false
    if (filtroMetodo !== 'todos' && r.metodo_pago !== filtroMetodo) return false
    return matchBusqueda(`${r.descripcion_problema ?? ''} ${r.direccion_inmueble ?? ''}`, r.id_incidente, r.monto_cobro)
  })

  // ── Paginación local ────────────────────────────────────────────────────────
  const pendientesPag = pendientesFiltrados.slice((paginaPend - 1) * POR_PAGINA, paginaPend * POR_PAGINA)
  const realizadosPag = realizadosFiltrados.slice((paginaPag - 1) * POR_PAGINA, paginaPag * POR_PAGINA)

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroEstado('todos')
    setFiltroInmueble('todos')
    setFiltroMonto('todos')
    setFiltroMetodo('todos')
    setPaginaPend(1)
    setPaginaPag(1)
  }

  const hayFiltrosActivos =
    !!busqueda || filtroEstado !== 'todos' || filtroInmueble !== 'todos' || filtroMonto !== 'todos' || filtroMetodo !== 'todos'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Pagos</h1>
        <p className="text-sm text-gray-500 mt-1">Estado de cobros por tus servicios contratados</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-4 border-l-orange-400 bg-orange-50/50">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-orange-700/70 mb-1">Pendiente</p>
            <p className="text-xl md:text-2xl font-bold text-orange-600 truncate">{fmt$(totalPendiente)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{pendientes.length} {pendientes.length === 1 ? 'cobro' : 'cobros'}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-400 bg-green-50/50">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-green-700/70 mb-1">Total pagado</p>
            <p className="text-xl md:text-2xl font-bold text-green-600 truncate">{fmt$(totalPagado)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{realizados.length} {realizados.length === 1 ? 'cobro' : 'cobros'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-gray-200">
        <CardContent className="pt-4 pb-4 px-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaPend(1); setPaginaPag(1) }}
              placeholder="Buscar por incidente, dirección, descripción o monto..."
              className="pl-9 h-9 text-sm"
            />
            {busqueda && (
              <button
                onClick={() => { setBusqueda(''); setPaginaPend(1); setPaginaPag(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={filtroEstado} onValueChange={(v: any) => { setFiltroEstado(v); setPaginaPend(1); setPaginaPag(1) }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="pagado">Pagados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroMonto} onValueChange={(v: any) => { setFiltroMonto(v); setPaginaPend(1); setPaginaPag(1) }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Monto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Cualquier monto</SelectItem>
                <SelectItem value="lt5k">Menos de $5.000</SelectItem>
                <SelectItem value="5to20k">$5.000 – $20.000</SelectItem>
                <SelectItem value="20to50k">$20.000 – $50.000</SelectItem>
                <SelectItem value="gt50k">Más de $50.000</SelectItem>
              </SelectContent>
            </Select>

            {inmueblesUnicos.length > 0 && (
              <Select value={filtroInmueble} onValueChange={(v) => { setFiltroInmueble(v); setPaginaPend(1); setPaginaPag(1) }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Inmueble" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los inmuebles</SelectItem>
                  {inmueblesUnicos.map(i => (
                    <SelectItem key={i.id} value={String(i.id)} className="truncate">{i.direccion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {metodosUnicos.length > 0 && (
              <Select value={filtroMetodo} onValueChange={(v) => { setFiltroMetodo(v); setPaginaPend(1); setPaginaPag(1) }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Método" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los métodos</SelectItem>
                  {metodosUnicos.map(m => (
                    <SelectItem key={m} value={m}>{METODO_LABELS[m] ?? m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {hayFiltrosActivos && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="text-xs h-7">
                <X className="h-3 w-3 mr-1" />Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pendientes */}
      {pendientesFiltrados.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pendientes de pago
            </h2>
            <span className="text-xs text-gray-500">{pendientesFiltrados.length} {pendientesFiltrados.length === 1 ? 'resultado' : 'resultados'}</span>
          </div>
          <div className="space-y-2.5">
            {pendientesPag.map(p => (
              <PagoCard
                key={p.id_presupuesto}
                idIncidente={p.id_incidente}
                descripcion={p.descripcion_problema}
                monto={p.monto_a_pagar}
                fecha={p.fecha_presupuesto}
                fechaLabel="Presupuesto del"
                inmueble={p.direccion_inmueble}
                estado="pendiente"
              />
            ))}
          </div>
          <Paginacion pagina={paginaPend} total={pendientesFiltrados.length} porPagina={POR_PAGINA} onChange={setPaginaPend} />
        </div>
      )}

      {/* Realizados */}
      {realizadosFiltrados.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Pagos realizados
            </h2>
            <span className="text-xs text-gray-500">{realizadosFiltrados.length} {realizadosFiltrados.length === 1 ? 'resultado' : 'resultados'}</span>
          </div>
          <div className="space-y-2.5">
            {realizadosPag.map(r => (
              <PagoCard
                key={r.id_cobro}
                idIncidente={r.id_incidente}
                descripcion={r.descripcion_problema}
                monto={r.monto_cobro}
                fecha={r.fecha_cobro}
                fechaLabel="Pagado el"
                inmueble={r.direccion_inmueble}
                estado="pagado"
                metodo={r.metodo_pago}
                banco={r.banco}
                cuotas={r.cuotas}
                referencia={r.referencia_pago}
                observaciones={r.observaciones}
              />
            ))}
          </div>
          <Paginacion pagina={paginaPag} total={realizadosFiltrados.length} porPagina={POR_PAGINA} onChange={setPaginaPag} />
        </div>
      )}

      {/* Sin resultados de filtros */}
      {pendientesFiltrados.length === 0 && realizadosFiltrados.length === 0 && (pendientes.length > 0 || realizados.length > 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Search className="h-8 w-8 text-gray-300 mb-2" />
            <p className="font-medium text-gray-600">Sin resultados</p>
            <p className="text-sm text-gray-400 mt-1">Probá con otros filtros o ajustá la búsqueda.</p>
            {hayFiltrosActivos && (
              <Button variant="outline" size="sm" onClick={limpiarFiltros} className="mt-3">
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state global */}
      {pendientes.length === 0 && realizados.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <DollarSign className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">Sin pagos</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Cuando se apruebe un presupuesto y se resuelva el incidente, los cobros aparecerán acá.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Card de pago/cobro — diseño minimalista, sin overflow ────────────────────

interface PagoCardProps {
  idIncidente: number
  descripcion: string | null
  monto: number
  fecha: string
  fechaLabel: string
  inmueble: string | null
  estado: 'pendiente' | 'pagado'
  metodo?: string
  banco?: string | null
  cuotas?: number | null
  referencia?: string | null
  observaciones?: string | null
}

function PagoCard({
  idIncidente, descripcion, monto, fecha, fechaLabel, inmueble, estado,
  metodo, banco, cuotas, referencia, observaciones,
}: PagoCardProps) {
  const esPagado = estado === 'pagado'
  return (
    <Card
      className={`overflow-hidden transition-shadow hover:shadow-sm ${
        esPagado ? 'border-green-200/60 bg-green-50/30' : 'border-orange-200/60 bg-orange-50/30'
      }`}
    >
      <CardContent className="py-4 px-4 space-y-3">
        {/* Header: incidente + estado + monto a la derecha pero con wrap */}
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">Incidente #{idIncidente}</span>
              <Badge
                className={
                  esPagado
                    ? 'bg-green-100 text-green-700 border-green-200 text-[10px] py-0.5 px-1.5'
                    : 'bg-orange-100 text-orange-700 border-orange-200 text-[10px] py-0.5 px-1.5'
                }
              >
                {esPagado ? 'Pagado' : 'Pendiente'}
              </Badge>
            </div>
            {descripcion && (
              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{descripcion}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className={`text-lg md:text-xl font-bold leading-none ${esPagado ? 'text-green-600' : 'text-orange-600'} whitespace-nowrap`}>
              {fmt$(monto)}
            </p>
          </div>
        </div>

        {/* Metadatos: inmueble, fecha, método */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-600">
          {inmueble && (
            <span className="inline-flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
              <span className="truncate max-w-[260px]">{inmueble}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3 text-gray-400 shrink-0" />
            <span>{fechaLabel} {fmtFecha(fecha)}</span>
          </span>
          {esPagado && metodo && (
            <span className="inline-flex items-center gap-1">
              <MetodoIcon metodo={metodo} />
              <span>
                {METODO_LABELS[metodo] ?? metodo}
                {banco ? ` · ${banco}` : ''}
                {cuotas && cuotas > 1 ? ` · ${cuotas} cuotas` : ''}
              </span>
            </span>
          )}
        </div>

        {/* Detalles adicionales (solo pagados) */}
        {esPagado && (referencia || observaciones) && (
          <div className="pt-2 border-t border-gray-100/60 space-y-1">
            {referencia && (
              <p className="text-xs text-gray-500 inline-flex items-center gap-1">
                <FileText className="h-3 w-3 text-gray-400" />
                Ref: <span className="font-mono text-gray-600">{referencia}</span>
              </p>
            )}
            {observaciones && (
              <p className="text-xs text-gray-500 italic">{observaciones}</p>
            )}
          </div>
        )}

        {/* Nota para pendientes */}
        {!esPagado && (
          <p className="text-[11px] text-gray-500 bg-white/70 border border-orange-200/40 rounded-md px-2.5 py-1.5">
            La administración te contactará para coordinar el pago.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
