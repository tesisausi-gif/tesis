'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileSpreadsheet, Download, BarChart3, TrendingUp, Users, Building2, DollarSign, Star, Wrench, LayoutDashboard, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FilaFechasPicker } from '@/components/ui/date-picker-informes'
import { toast } from 'sonner'
import {
  getTecnicosSelect,
  getInmueblesSelect,
  getR1IncidentesPorTipoEstado,
  getR2TiemposResolucion,
  getR3TecnicosPorVolumen,
  getR4PropiedadesMasIncidentes,
  getR5RentabilidadPorRefaccion,
  getR6DesempenoTecnicos,
  getR7Satisfaccion,
  getR8CostosMantenimiento,
  getR10RentabilidadInmueble,
  getR11ComparativoDesempenio,
  getR12IndicadoresGlobales,
  getR13MediosDePago,
} from '@/features/exportar/exportar.service'
import { CategoriaIncidente } from '@/shared/types/enums'
import type {
  TecnicoSelect, InmuebleSelect,
  R1Resultado, R2Resultado, R3Resultado, R4Resultado, R5Resultado, R6Resultado,
  R7Resultado, R8Resultado, R10Resultado, R11Resultado, R12Resultado,
  R13Resultado,
} from '@/features/exportar/exportar.types'

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escaparCSV(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}
function generarCSV(cols: string[], filas: Record<string, unknown>[]): string {
  return [cols.map(escaparCSV).join(','), ...filas.map(f => cols.map(c => escaparCSV(f[c])).join(','))].join('\n')
}
function descargarCSV(csv: string, nombre: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const AR = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const fmt$ = (n: number) => AR.format(n)
const fmtPct = (n: number) => `${n.toFixed(1)}%`
const fmtN = (n: number) => n.toFixed(1)
const hoy = () => new Date().toISOString().slice(0, 10)

// ─── Shared sub-components ────────────────────────────────────────────────────

function KpiCard({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-blue-50 border-blue-200 p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-blue-700 mt-0.5">{valor}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

// FilaFechas ahora usa el DatePicker con calendario (ver date-picker-informes.tsx)

function SelectCategoria({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const cats = Object.values(CategoriaIncidente)
  return (
    <div className="space-y-1">
      <Label className="text-xs">Categoría</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas</SelectItem>
          {cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function SelectTecnico({ value, onChange, tecnicos }: { value: string; onChange: (v: string) => void; tecnicos: TecnicoSelect[] }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">Técnico</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {tecnicos.map(t => (
            <SelectItem key={t.id_tecnico} value={String(t.id_tecnico)}>{t.nombre} {t.apellido}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SelectInmueble({ value, onChange, inmuebles }: { value: string; onChange: (v: string) => void; inmuebles: InmuebleSelect[] }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">Inmueble</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {inmuebles.map(i => (
            <SelectItem key={i.id_inmueble} value={String(i.id_inmueble)}>{i.calle}, {i.localidad}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function TablaResultados({ cols, filas }: { cols: string[]; filas: Record<string, unknown>[] }) {
  if (!filas.length) return <p className="text-sm text-muted-foreground py-4 text-center">Sin datos para mostrar.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            {cols.map(c => <th key={c} className="text-left py-2 px-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
              {cols.map(c => <td key={c} className="py-2 px-3 text-xs">{String(fila[c] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BotonesExport({
  onCSV, onPDF, disabled, cargando,
}: { onCSV: () => void; onPDF: () => void; disabled: boolean; cargando: boolean }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={onCSV} disabled={disabled} className="gap-1.5 text-xs">
        <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
      </Button>
      <Button size="sm" variant="outline" onClick={onPDF} disabled={disabled} className="gap-1.5 text-xs">
        <Download className="h-3.5 w-3.5" /> PDF
      </Button>
    </div>
  )
}

function BtnGenerar({ onClick, cargando, desde, hasta, fechaRequerida = true }: { onClick: () => void; cargando: boolean; desde?: string; hasta?: string; fechaRequerida?: boolean }) {
  const faltaFecha = fechaRequerida && (!desde || !hasta)
  return (
    <Button
      onClick={onClick}
      disabled={cargando || faltaFecha}
      size="sm"
      className="gap-1.5"
      title={faltaFecha ? 'Seleccioná ambas fechas para generar el informe' : undefined}
    >
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
      Generar reporte
    </Button>
  )
}

function abrirPDF(tipo: number | string, params: Record<string, string | undefined>) {
  const qs = new URLSearchParams()
  qs.set('tipo', String(tipo))
  qs.set('autoprint', '1')
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v)
  }
  window.open(`/exportar/imprimir?${qs.toString()}`, '_blank', 'width=1100,height=800,noopener')
}

// ─── R1: Incidentes por Tipo y Estado ────────────────────────────────────────

function TabR1() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [estado, setEstado] = useState('todos')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R1Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR1IncidentesPorTipoEstado({
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        categoria: categoria === 'todas' ? undefined : categoria,
        estadoActual: estado === 'todos' ? undefined : estado,
      })
      setResultado(r)
    } catch { toast.error('Error al generar R1') }
    finally { setCargando(false) }
  }

  const cols = ['Categoría', 'Cantidad', '%']
  const filas = resultado?.porCategoria.map(c => ({ 'Categoría': c.categoria, 'Cantidad': c.cantidad, '%': fmtPct(c.porcentaje) })) ?? []

  const estadosFijos = ['pendiente', 'en_proceso', 'resuelto']

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
            <SelectCategoria value={categoria} onChange={setCategoria} />
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {estadosFijos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total" valor={String(resultado.total)} />
            <KpiCard label="% Finalizados" valor={fmtPct(resultado.porcentajeCerrados)} sub="del total" />
            <KpiCard label="% En proceso" valor={fmtPct(resultado.porcentajeEnCurso)} sub="del total" />
            <KpiCard label="% Pendientes" valor={fmtPct(resultado.porcentajePendientes)} sub="del total" />
            <KpiCard label="Frec. diaria" valor={fmtN(resultado.promedioDiario)} sub="incidentes/día (en período)" />
          </div>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Desglose por Categoría</CardTitle>
              <BotonesExport
                disabled={!filas.length}
                cargando={cargando}
                onCSV={() => descargarCSV(generarCSV(cols, filas), `r1_categorias_${hoy()}.csv`)}
                onPDF={() => abrirPDF(1, { fechaDesde: desde, fechaHasta: hasta, categoria: categoria === 'todas' ? undefined : categoria, estadoActual: estado === 'todos' ? undefined : estado })}
              />
            </CardHeader>
            <CardContent>
              <TablaResultados cols={cols} filas={filas} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── R2: Tiempos de Resolución ────────────────────────────────────────────────

function TabR2() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [orden, setOrden] = useState('mayor')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R2Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR2TiemposResolucion({
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        categoria: categoria === 'todas' ? undefined : categoria,
        ordenarPor: orden as any,
      })
      setResultado(r)
    } catch { toast.error('Error al generar R2') }
    finally { setCargando(false) }
  }

  const cols = ['ID', 'Categoría', 'Descripción', 'Inmueble', 'Días']
  const filas = resultado?.incidentesMasLentos.map(i => ({
    'ID': `#${i.id_incidente}`, 'Categoría': i.categoria,
    'Descripción': i.descripcion, 'Inmueble': i.inmueble, 'Días': i.dias,
  })) ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
            <SelectCategoria value={categoria} onChange={setCategoria} />
            <div className="space-y-1">
              <Label className="text-xs">Ordenar por</Label>
              <Select value={orden} onValueChange={setOrden}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mayor">Más lentos primero</SelectItem>
                  <SelectItem value="menor">Más rápidos primero</SelectItem>
                  <SelectItem value="reciente">Más recientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Promedio días" valor={fmtN(resultado.promedioDias)} />
            <KpiCard label="Mínimo días" valor={String(resultado.minDias)} />
            <KpiCard label="Máximo días" valor={String(resultado.maxDias)} />
            <KpiCard label="Total" valor={String(resultado.totalIncidentes)} />
          </div>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Incidentes ({resultado.incidentesMasLentos.length} mostrados)</CardTitle>
              <BotonesExport disabled={!filas.length} cargando={cargando}
                onCSV={() => descargarCSV(generarCSV(cols, filas), `r2_tiempos_${hoy()}.csv`)}
                onPDF={() => abrirPDF(2, { fechaDesde: desde, fechaHasta: hasta, categoria: categoria === 'todas' ? undefined : categoria, ordenarPor: orden })}
              />
            </CardHeader>
            <CardContent><TablaResultados cols={cols} filas={filas} /></CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── R3: Técnicos por Volumen ─────────────────────────────────────────────────

function TabR3({ tecnicos }: { tecnicos: TecnicoSelect[] }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [tecnico, setTecnico] = useState('todos')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R3Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR3TecnicosPorVolumen({
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        idTecnico: tecnico === 'todos' ? undefined : Number(tecnico),
      })
      setResultado(r)
    } catch { toast.error('Error al generar R3') }
    finally { setCargando(false) }
  }

  const cols = ['Técnico', 'Especialidad', 'Asignados', 'Cerrados', 'En curso', 'Tasa %', 'Días prom.']
  const filas = resultado?.tecnicos.map(t => ({
    'Técnico': `${t.nombre} ${t.apellido}`, 'Especialidad': t.especialidad,
    'Asignados': t.asignados, 'Cerrados': t.cerrados, 'En curso': t.enCurso,
    'Tasa %': fmtPct(t.tasaCierre), 'Días prom.': fmtN(t.promedioDias),
  })) ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
            <SelectTecnico value={tecnico} onChange={setTecnico} tecnicos={tecnicos} />
          </div>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="Total técnicos" valor={String(resultado.totalTecnicos)} />
            <KpiCard label="Prom. asignados" valor={fmtN(resultado.promedioAsignados)} />
            <KpiCard label="Prom. cerrados" valor={fmtN(resultado.promedioCerrados)} />
          </div>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Técnicos</CardTitle>
              <BotonesExport disabled={!filas.length} cargando={cargando}
                onCSV={() => descargarCSV(generarCSV(cols, filas), `r3_tecnicos_${hoy()}.csv`)}
                onPDF={() => abrirPDF(3, { fechaDesde: desde, fechaHasta: hasta, idTecnico: tecnico === 'todos' ? undefined : tecnico })}
              />
            </CardHeader>
            <CardContent><TablaResultados cols={cols} filas={filas} /></CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── R4: Propiedades con Más Incidentes ───────────────────────────────────────

function TabR4({ inmuebles }: { inmuebles: InmuebleSelect[] }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [inmueble, setInmueble] = useState('todos')
  const [topN, setTopN] = useState('10')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R4Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR4PropiedadesMasIncidentes({
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        idInmueble: inmueble === 'todos' ? undefined : Number(inmueble),
        topN: Number(topN) || 10,
      })
      setResultado(r)
    } catch { toast.error('Error al generar R4') }
    finally { setCargando(false) }
  }

  const cols = ['Inmueble', 'Incidentes', 'Costo total', 'Tipo frecuente', 'Abiertos']
  const filas = resultado?.inmuebles.map(i => ({
    'Inmueble': i.nombre, 'Incidentes': i.totalIncidentes, 'Costo total': fmt$(i.costoTotal),
    'Tipo frecuente': i.tipoFrecuente, 'Abiertos': i.incidentesAbiertos,
  })) ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
            <SelectInmueble value={inmueble} onChange={setInmueble} inmuebles={inmuebles} />
            <div className="space-y-1">
              <Label className="text-xs">Top N propiedades</Label>
              <Input type="number" min="1" max="50" value={topN} onChange={e => setTopN(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="Propiedades" valor={String(resultado.totalPropiedades)} />
            <KpiCard label="Total incidentes" valor={String(resultado.totalIncidentes)} />
            <KpiCard label="Costo total" valor={fmt$(resultado.costoTotal)} />
          </div>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Propiedades</CardTitle>
              <BotonesExport disabled={!filas.length} cargando={cargando}
                onCSV={() => descargarCSV(generarCSV(cols, filas), `r4_propiedades_${hoy()}.csv`)}
                onPDF={() => abrirPDF(4, { fechaDesde: desde, fechaHasta: hasta, idInmueble: inmueble === 'todos' ? undefined : inmueble, topN })}
              />
            </CardHeader>
            <CardContent><TablaResultados cols={cols} filas={filas} /></CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── R5: Rentabilidad por Refacción ──────────────────────────────────────────

function TabR5() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R5Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR5RentabilidadPorRefaccion({
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        categoria: categoria === 'todas' ? undefined : categoria,
      })
      setResultado(r)
    } catch { toast.error('Error al generar R5') }
    finally { setCargando(false) }
  }

  const cols = ['Tipo', 'Cobrado a cliente', 'Pagado al técnico', 'Comisión ISBA', 'Margen %']
  const filas = resultado?.porTipo.map(t => ({
    'Tipo': t.tipo,
    'Cobrado a cliente': fmt$(t.ingresoBruto),
    'Pagado al técnico': fmt$(t.costoPagadoTecnico),
    'Comisión ISBA': fmt$(t.comision),
    'Margen %': fmtPct(t.margen),
  })) ?? []

  return (
    <div className="space-y-4">
      <Card className="border-blue-100 bg-blue-50/40">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-blue-700">
            <strong>Nota:</strong> Comisión ISBA = lo cobrado al cliente menos lo pagado al técnico (materiales + mano de obra).
            Los gastos administrativos incluidos en el presupuesto quedan como margen de la inmobiliaria.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
            <SelectCategoria value={categoria} onChange={setCategoria} />
          </div>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total cobrado" valor={fmt$(resultado.ingresoTotal)} sub="a clientes" />
            <KpiCard label="Total pagado" valor={fmt$(resultado.costoTotal)} sub="a técnicos" />
            <KpiCard label="Comisión ISBA" valor={fmt$(resultado.comisionTotal)} sub="margen neto" />
            <KpiCard label="Margen global" valor={fmtPct(resultado.margenGlobal)} />
          </div>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Por tipo de refacción</CardTitle>
              <BotonesExport disabled={!filas.length} cargando={cargando}
                onCSV={() => descargarCSV(generarCSV(cols, filas), `r5_rentabilidad_${hoy()}.csv`)}
                onPDF={() => abrirPDF(5, { fechaDesde: desde, fechaHasta: hasta, categoria: categoria === 'todas' ? undefined : categoria })}
              />
            </CardHeader>
            <CardContent><TablaResultados cols={cols} filas={filas} /></CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── R6: Desempeño de Técnicos ────────────────────────────────────────────────

function TabR6({ tecnicos }: { tecnicos: TecnicoSelect[] }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [tecnico, setTecnico] = useState('todos')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R6Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR6DesempenoTecnicos({
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        idTecnico: tecnico === 'todos' ? undefined : Number(tecnico),
      })
      setResultado(r)
    } catch { toast.error('Error al generar R6') }
    finally { setCargando(false) }
  }

  const cols = ['#', 'Técnico', 'Especialidad', 'Asignados', 'Cerrados', 'Rechazadas', 'Productividad %', 'Días resp. prom.', 'Satisfacción ★']
  const filas = resultado?.tecnicos.map(t => ({
    '#': t.rankingPos,
    'Técnico': `${t.nombre} ${t.apellido}`,
    'Especialidad': t.especialidad || '—',
    'Asignados': t.asignados,
    'Cerrados': t.cerrados,
    'Rechazadas': t.rechazadas,
    'Productividad %': fmtPct(t.productividad),
    'Días resp. prom.': t.promedioDiasRespuesta > 0 ? fmtN(t.promedioDiasRespuesta) : '—',
    'Satisfacción ★': t.satisfaccion != null ? `${fmtN(t.satisfaccion)} ★` : 'N/A',
  })) ?? []

  return (
    <div className="space-y-4">
      <Card className="border-blue-100 bg-blue-50/40">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-blue-700">
            <strong>Productividad</strong> = cerrados / asignados × 100 · <strong>Días resp.</strong> = días promedio desde registro del incidente hasta la asignación · <strong>Rechazadas</strong> = asignaciones rechazadas o canceladas por el técnico.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
            <SelectTecnico value={tecnico} onChange={setTecnico} tecnicos={tecnicos} />
          </div>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="Total técnicos" valor={String(resultado.totalTecnicos)} />
            <KpiCard label="Productividad prom." valor={fmtPct(resultado.promedioProductividad)} />
            <KpiCard label="Satisfacción prom." valor={resultado.promedioSatisfaccion > 0 ? `${fmtN(resultado.promedioSatisfaccion)} ★` : 'N/A'} />
          </div>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Ranking de desempeño</CardTitle>
              <BotonesExport disabled={!filas.length} cargando={cargando}
                onCSV={() => descargarCSV(generarCSV(cols, filas), `r6_desempeno_${hoy()}.csv`)}
                onPDF={() => abrirPDF(6, { fechaDesde: desde, fechaHasta: hasta, idTecnico: tecnico === 'todos' ? undefined : tecnico })}
              />
            </CardHeader>
            <CardContent><TablaResultados cols={cols} filas={filas} /></CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── R7: Satisfacción de ISBA ─────────────────────────────────────────────────

function TabR7({ tecnicos }: { tecnicos: TecnicoSelect[] }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [tecnico, setTecnico] = useState('todos')
  const [calMin, setCalMin] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R7Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR7Satisfaccion({
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        idTecnico: tecnico === 'todos' ? undefined : Number(tecnico),
        calificacionMinima: calMin ? Number(calMin) : undefined,
      })
      setResultado(r)
    } catch { toast.error('Error al generar R7') }
    finally { setCargando(false) }
  }

  const cols = ['Técnico', 'Promedio ★', 'Evaluaciones', '5★', '4★', '3★', '2★', '1★']
  const filas = resultado?.tecnicos.map(t => ({
    'Técnico': `${t.nombre} ${t.apellido}`, 'Promedio ★': fmtN(t.promedioPuntuacion),
    'Evaluaciones': t.totalEvaluaciones,
    '5★': t.distribucion['5'] || 0, '4★': t.distribucion['4'] || 0,
    '3★': t.distribucion['3'] || 0, '2★': t.distribucion['2'] || 0, '1★': t.distribucion['1'] || 0,
  })) ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
            <SelectTecnico value={tecnico} onChange={setTecnico} tecnicos={tecnicos} />
            <div className="space-y-1">
              <Label className="text-xs">Calificación mínima (1-5)</Label>
              <Input type="number" min="1" max="5" value={calMin} onChange={e => setCalMin(e.target.value)} className="h-8 text-sm" placeholder="Sin mínimo" />
            </div>
          </div>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Promedio global" valor={`${fmtN(resultado.promedioGlobal)} ★`} />
            <KpiCard label="Total evaluaciones" valor={String(resultado.totalEvaluaciones)} />
          </div>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Satisfacción por técnico</CardTitle>
              <BotonesExport disabled={!filas.length} cargando={cargando}
                onCSV={() => descargarCSV(generarCSV(cols, filas), `r7_satisfaccion_${hoy()}.csv`)}
                onPDF={() => abrirPDF(7, { fechaDesde: desde, fechaHasta: hasta, idTecnico: tecnico === 'todos' ? undefined : tecnico, calificacionMinima: calMin || undefined })}
              />
            </CardHeader>
            <CardContent><TablaResultados cols={cols} filas={filas} /></CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── R8: Costos de Mantenimiento ─────────────────────────────────────────────

function TabR8() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R8Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR8CostosMantenimiento({
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        categoria: categoria === 'todas' ? undefined : categoria,
      })
      setResultado(r)
    } catch { toast.error('Error al generar R8') }
    finally { setCargando(false) }
  }

  const cols = ['Categoría', 'Costo total', 'Materiales', 'Mano de obra', 'Incidentes', 'Promedio']
  const filas = resultado?.porCategoria.map(c => ({
    'Categoría': c.categoria, 'Costo total': fmt$(c.costoTotal), 'Materiales': fmt$(c.materiales),
    'Mano de obra': fmt$(c.manoObra), 'Incidentes': c.totalIncidentes, 'Promedio': fmt$(c.promedioCosto),
  })) ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
            <SelectCategoria value={categoria} onChange={setCategoria} />
          </div>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="Costo total" valor={fmt$(resultado.costoTotal)} />
            <KpiCard label="Total incidentes" valor={String(resultado.totalIncidentes)} />
            <KpiCard label="Costo promedio" valor={fmt$(resultado.costoPromedio)} />
          </div>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Costos por categoría</CardTitle>
              <BotonesExport disabled={!filas.length} cargando={cargando}
                onCSV={() => descargarCSV(generarCSV(cols, filas), `r8_costos_${hoy()}.csv`)}
                onPDF={() => abrirPDF(8, { fechaDesde: desde, fechaHasta: hasta, categoria: categoria === 'todas' ? undefined : categoria })}
              />
            </CardHeader>
            <CardContent><TablaResultados cols={cols} filas={filas} /></CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── R10: Rentabilidad por Inmueble ──────────────────────────────────────────

function TabR10({ inmuebles }: { inmuebles: InmuebleSelect[] }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [inmueble, setInmueble] = useState('todos')
  const [topN, setTopN] = useState('10')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R10Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR10RentabilidadInmueble({
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        idInmueble: inmueble === 'todos' ? undefined : Number(inmueble),
        topN: Number(topN) || 10,
      })
      setResultado(r)
    } catch { toast.error('Error al generar R10') }
    finally { setCargando(false) }
  }

  const cols = ['Inmueble', 'Ingresos', 'Costos', 'Rentabilidad', 'Margen %', 'Incidentes']
  const filas = resultado?.inmuebles.map(i => ({
    'Inmueble': i.nombre, 'Ingresos': fmt$(i.ingresos), 'Costos': fmt$(i.costos),
    'Rentabilidad': fmt$(i.rentabilidadNeta), 'Margen %': fmtPct(i.margen), 'Incidentes': i.totalIncidentes,
  })) ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
            <SelectInmueble value={inmueble} onChange={setInmueble} inmuebles={inmuebles} />
            <div className="space-y-1">
              <Label className="text-xs">Top N inmuebles</Label>
              <Input type="number" min="1" max="50" value={topN} onChange={e => setTopN(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Ingresos" valor={fmt$(resultado.ingresosTotal)} />
            <KpiCard label="Costos" valor={fmt$(resultado.costosTotal)} />
            <KpiCard label="Rentabilidad neta" valor={fmt$(resultado.rentabilidadNeta)} />
            <KpiCard label="Margen global" valor={fmtPct(resultado.margenGlobal)} />
          </div>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Rentabilidad por inmueble</CardTitle>
              <BotonesExport disabled={!filas.length} cargando={cargando}
                onCSV={() => descargarCSV(generarCSV(cols, filas), `r10_rentabilidad_inmueble_${hoy()}.csv`)}
                onPDF={() => abrirPDF(10, { fechaDesde: desde, fechaHasta: hasta, idInmueble: inmueble === 'todos' ? undefined : inmueble, topN })}
              />
            </CardHeader>
            <CardContent><TablaResultados cols={cols} filas={filas} /></CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── R11: Comparativo de Desempeño ───────────────────────────────────────────

function TabR11() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [periodo, setPeriodo] = useState('semestral')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R11Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR11ComparativoDesempenio({
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        periodo: periodo as any,
      })
      setResultado(r)
    } catch { toast.error('Error al generar R11') }
    finally { setCargando(false) }
  }

  const cols = resultado ? ['Indicador', resultado.periodo1Label, resultado.periodo2Label, 'Cambio %', 'Tendencia'] : []
  const filas = resultado?.indicadores.map(i => ({
    'Indicador': i.indicador,
    [resultado.periodo1Label]: fmtN(i.periodo1),
    [resultado.periodo2Label]: fmtN(i.periodo2),
    'Cambio %': `${i.cambioPorcentaje >= 0 ? '+' : ''}${fmtN(i.cambioPorcentaje)}%`,
    'Tendencia': i.tendencia === 'sube' ? '↑ Sube' : i.tendencia === 'baja' ? '↓ Baja' : '→ Igual',
  })) ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
            <div className="space-y-1">
              <Label className="text-xs">Período por defecto</Label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Si se especifican fechas, se divide en dos mitades. Si no, se usa el período seleccionado hasta hoy.</p>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Período 1" valor={resultado.periodo1Label} />
            <KpiCard label="Período 2" valor={resultado.periodo2Label} />
          </div>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Comparativo de indicadores</CardTitle>
              <BotonesExport disabled={!filas.length} cargando={cargando}
                onCSV={() => descargarCSV(generarCSV(cols, filas), `r11_comparativo_${hoy()}.csv`)}
                onPDF={() => abrirPDF(11, { fechaDesde: desde, fechaHasta: hasta, periodo })}
              />
            </CardHeader>
            <CardContent><TablaResultados cols={cols} filas={filas} /></CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── R12: Indicadores Globales ────────────────────────────────────────────────

function TabR12() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [topTec, setTopTec] = useState('5')
  const [topProp, setTopProp] = useState('5')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R12Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR12IndicadoresGlobales({
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        topTecnicos: Number(topTec) || 5,
        topPropiedades: Number(topProp) || 5,
      })
      setResultado(r)
    } catch { toast.error('Error al generar R12') }
    finally { setCargando(false) }
  }

  const colsTec = ['Top Técnicos', 'Asignados', 'Cerrados', 'Satisfacción ★']
  const filasTec = resultado?.topTecnicos.map(t => ({
    'Top Técnicos': `${t.nombre} ${t.apellido}`,
    'Asignados': t.asignados, 'Cerrados': t.cerrados,
    'Satisfacción ★': t.satisfaccion > 0 ? `${fmtN(t.satisfaccion)} ★` : 'N/A',
  })) ?? []

  const colsProp = ['Propiedad', 'Dirección', 'Incidentes']
  const filasProp = resultado?.topPropiedades.map(p => ({
    'Propiedad': p.nombre, 'Dirección': p.direccion, 'Incidentes': p.incidentes,
  })) ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
            <div className="space-y-1">
              <Label className="text-xs">Top técnicos</Label>
              <Input type="number" min="3" max="10" value={topTec} onChange={e => setTopTec(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Top propiedades</Label>
              <Input type="number" min="3" max="10" value={topProp} onChange={e => setTopProp(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total incidentes" valor={String(resultado.totalIncidentes)} />
            <KpiCard label="Abiertos" valor={String(resultado.incidentesAbiertos)} />
            <KpiCard label="Finalizados" valor={String(resultado.incidentesCerrados)} />
            <KpiCard label="Días prom. resolución" valor={fmtN(resultado.promedioResolucionDias)} />
            <KpiCard label="Ingresos totales" valor={fmt$(resultado.totalIngresos)} />
            <KpiCard label="Costos totales" valor={fmt$(resultado.totalCostos)} />
            <KpiCard label="Rentabilidad neta" valor={fmt$(resultado.rentabilidadNeta)} />
            <KpiCard label="Satisfacción prom." valor={resultado.satisfaccionPromedio > 0 ? `${fmtN(resultado.satisfaccionPromedio)} ★` : 'N/A'} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Top técnicos</CardTitle>
                <BotonesExport disabled={!filasTec.length} cargando={cargando}
                  onCSV={() => descargarCSV(generarCSV(colsTec, filasTec), `r12_top_tecnicos_${hoy()}.csv`)}
                  onPDF={() => abrirPDF(12, { fechaDesde: desde, fechaHasta: hasta, topTecnicos: topTec, topPropiedades: topProp })}
                />
              </CardHeader>
              <CardContent><TablaResultados cols={colsTec} filas={filasTec} /></CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top propiedades</CardTitle>
              </CardHeader>
              <CardContent><TablaResultados cols={colsProp} filas={filasProp} /></CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

// ─── R13: Medios de Pago ─────────────────────────────────────────────────────

const METODO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito', credito: 'Crédito',
}

function TabR13() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<R13Resultado | null>(null)

  const generar = async () => {
    setCargando(true)
    try {
      const r = await getR13MediosDePago({ fechaDesde: desde || undefined, fechaHasta: hasta || undefined })
      setResultado(r)
    } catch { toast.error('Error al generar R13') }
    finally { setCargando(false) }
  }

  const colsMetodos = ['Método', 'Transacciones', 'Cobrado a Clientes', 'Pagado a Técnicos', 'Total']
  const filasMetodos = resultado?.porMetodo.map(m => ({
    'Método': METODO_LABELS[m.metodo] ?? m.metodo,
    'Transacciones': m.cantidad,
    'Cobrado a Clientes': fmt$(m.montoCobradoClientes),
    'Pagado a Técnicos': fmt$(m.montoPagadoTecnicos),
    'Total': fmt$(m.montoTotal),
  })) ?? []

  const totalTransacciones = resultado ? resultado.cantidadCobros + resultado.cantidadPagos : 0

  return (
    <div className="space-y-4">
      <Card className="border-blue-100 bg-blue-50/40">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-blue-700">
            <strong>Cobrado a clientes</strong>: montos registrados en cobros_clientes (lo que el cliente pagó a ISBA por cada incidente). ·{' '}
            <strong>Pagado a técnicos</strong>: montos registrados en pagos_tecnicos (materiales + mano de obra). ·{' '}
            <strong>Total</strong>: suma de ambos flujos para el mismo método de pago.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <FilaFechasPicker desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          </div>
          <BtnGenerar onClick={generar} cargando={cargando} desde={desde} hasta={hasta} fechaRequerida={false} />
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total cobrado a clientes" valor={fmt$(resultado.totalCobradoClientes)} />
            <KpiCard label="Total pagado a técnicos" valor={fmt$(resultado.totalPagadoTecnicos)} />
            <KpiCard label="Cobros registrados" valor={String(resultado.cantidadCobros)} />
            <KpiCard label="Pagos a técnicos" valor={String(resultado.cantidadPagos)} />
          </div>

          {resultado.porMetodo.length > 0 && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Distribución por medio de pago</CardTitle>
                  <CardDescription className="text-xs">{totalTransacciones} transacciones totales</CardDescription>
                </div>
                <BotonesExport disabled={!filasMetodos.length} cargando={cargando}
                  onCSV={() => descargarCSV(generarCSV(colsMetodos, filasMetodos), `r13_medios_pago_${hoy()}.csv`)}
                  onPDF={() => abrirPDF(13, { fechaDesde: desde, fechaHasta: hasta })}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {resultado.porMetodo.map(m => {
                  const maxMonto = resultado.porMetodo[0]?.montoTotal || 1
                  const pctMonto = maxMonto > 0 ? Math.round((m.montoTotal / maxMonto) * 100) : 0
                  const metodoLabel = METODO_LABELS[m.metodo] ?? m.metodo
                  return (
                    <div key={m.metodo} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{metodoLabel}</span>
                          <Badge variant="outline" className="text-xs">{m.cantidad} transac.</Badge>
                        </div>
                        <span className="font-bold text-gray-700">{fmt$(m.montoTotal)}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${pctMonto}%` }} />
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span className="text-green-600">Cobrado clientes: {fmt$(m.montoCobradoClientes)}</span>
                        <span className="text-blue-600">Pagado técnicos: {fmt$(m.montoPagadoTecnicos)}</span>
                      </div>
                    </div>
                  )
                })}
                <TablaResultados cols={colsMetodos} filas={filasMetodos} />
              </CardContent>
            </Card>
          )}

          {resultado.porMetodo.length === 0 && (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center py-10 text-center">
                <DollarSign className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-gray-500">Sin transacciones registradas en el período</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ExportarContent() {
  const [tecnicos, setTecnicos] = useState<TecnicoSelect[]>([])
  const [inmuebles, setInmuebles] = useState<InmuebleSelect[]>([])

  useEffect(() => {
    Promise.all([getTecnicosSelect(), getInmueblesSelect()])
      .then(([t, i]) => { setTecnicos(t); setInmuebles(i) })
      .catch(() => { /* selects quedan vacíos, los reportes siguen funcionando */ })
  }, [])

  const tabs = [
    { value: 'r1', label: 'Incidentes', icon: BarChart3, desc: 'Por tipo y estado', info: 'Identifica qué tipos de incidentes ocurren más seguido y en qué períodos, para planificar mantenimiento preventivo y asignar recursos.' },
    { value: 'r2', label: 'Tiempos', icon: TrendingUp, desc: 'Resolución', info: 'Detecta cuellos de botella en la resolución: qué tipos de trabajo tardan más y cuáles técnicos resuelven más rápido, para mejorar la asignación.' },
    { value: 'r3', label: 'Vol. Técnicos', icon: Users, desc: 'Asignaciones', info: 'Muestra la carga de trabajo real de cada técnico: cuántos trabajos tomó, cerró y tiene en curso. Útil para detectar sobrecarga o subutilización.' },
    { value: 'r4', label: 'Propiedades', icon: Building2, desc: 'Con más incidentes', info: 'Identifica las propiedades con mayor frecuencia de incidentes y costos de mantenimiento. Permite justificar inspecciones o renegociar contratos.' },
    { value: 'r5', label: 'Rentabilidad', icon: DollarSign, desc: 'Por refacción', info: 'Muestra la comisión real de ISBA (cobrado al cliente menos pagado al técnico) por cada tipo de servicio. Permite priorizar categorías más rentables.' },
    { value: 'r6', label: 'Desempeño', icon: Star, desc: 'Ranking técnicos', info: 'Ranking integral de técnicos: productividad (cierre de trabajos), asignaciones rechazadas, tiempo de respuesta y satisfacción del cliente. No disponible en ninguna otra sección.' },
    { value: 'r7', label: 'Satisfacción', icon: Star, desc: 'Calificaciones ISBA', info: 'Distribución detallada de calificaciones por técnico con comentarios reales de clientes. Permite detectar problemas de atención antes de que escalen.' },
    { value: 'r8', label: 'Costos', icon: Wrench, desc: 'Mantenimiento', info: 'Desglose de costos de presupuesto (materiales, mano de obra, gastos admin) por categoría. Requiere que los presupuestos estén cargados con montos reales.' },
    { value: 'r10', label: 'Rent. Inmueble', icon: Building2, desc: 'Por propiedad', info: 'Compara ingresos vs costos por propiedad, mostrando cuáles generan mayor margen. Útil para priorizar la cartera y negociar condiciones con propietarios.' },
    { value: 'r11', label: 'Comparativo', icon: TrendingUp, desc: 'Período a período', info: 'Compara KPIs clave (incidentes, tiempos, ingresos, satisfacción) entre dos períodos consecutivos, mostrando tendencia de mejora o deterioro del negocio.' },
    { value: 'r12', label: 'Dashboard', icon: LayoutDashboard, desc: 'Indicadores globales', info: 'Resumen ejecutivo de todos los indicadores clave en un solo informe: volumen, tiempos, ingresos, satisfacción y top técnicos/propiedades. Ideal para reportes a directivos.' },
    { value: 'r13', label: 'Medios de Pago', icon: DollarSign, desc: 'Cobros y pagos', info: 'Analiza qué métodos de pago usan clientes y técnicos, con montos por método. Permite evaluar la adopción de medios digitales y detectar preferencias.' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Informes y Reportes</h2>
        <p className="text-muted-foreground mt-1">12 reportes analíticos con filtros, exportación CSV y PDF para impresión.</p>
      </div>

      <TooltipProvider>
      <Tabs defaultValue="r1">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1 rounded-lg mb-2">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex flex-col items-center gap-0 px-3 py-1.5 text-xs leading-tight h-auto">
              <div className="flex items-center gap-1">
                <span className="font-medium">{t.label}</span>
                {t.info && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs z-50">
                      {t.info}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:block">{t.desc}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="r1"><TabR1 /></TabsContent>
        <TabsContent value="r2"><TabR2 /></TabsContent>
        <TabsContent value="r3"><TabR3 tecnicos={tecnicos} /></TabsContent>
        <TabsContent value="r4"><TabR4 inmuebles={inmuebles} /></TabsContent>
        <TabsContent value="r5"><TabR5 /></TabsContent>
        <TabsContent value="r6"><TabR6 tecnicos={tecnicos} /></TabsContent>
        <TabsContent value="r7"><TabR7 tecnicos={tecnicos} /></TabsContent>
        <TabsContent value="r8"><TabR8 /></TabsContent>
        <TabsContent value="r10"><TabR10 inmuebles={inmuebles} /></TabsContent>
        <TabsContent value="r11"><TabR11 /></TabsContent>
        <TabsContent value="r12"><TabR12 /></TabsContent>
        <TabsContent value="r13"><TabR13 /></TabsContent>
      </Tabs>
      </TooltipProvider>
    </div>
  )
}
