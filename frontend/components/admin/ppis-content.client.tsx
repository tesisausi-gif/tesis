'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, AlertCircle, Info, Clock, TrendingUp, Tag, Layers, Repeat2, Gauge, Zap, User, Wrench, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import type { TodosPpisData, TciData, FpyData, FpyEtapa, WipData, WipEtapa, ReasignacionData, ReasignacionPorTecnico, Semaforo, TciPorPrioridad, TciPorCategoria, TcrData, TcrPorTecnico, Sp8Data, Sp8ItemPendiente, IscData, IscPorTecnico, Cb2Data, OeeData, IrtTecnico } from '@/features/reportes/metricas-ppis.service'

// ─── Helpers visuales ─────────────────────────────────────────────────────────

function SemaforoIcon({ s, size = 'sm' }: { s: Semaforo; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'
  if (s === 'verde')    return <CheckCircle2 className={`${cls} text-emerald-500`} />
  if (s === 'amarillo') return <AlertCircle  className={`${cls} text-amber-500`} />
  if (s === 'rojo')     return <XCircle      className={`${cls} text-red-500`} />
  return <Info className={`${cls} text-slate-400`} />
}

function SemaforoBadge({ s, texto }: { s: Semaforo; texto: string }) {
  const styles: Record<Semaforo, string> = {
    verde:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    amarillo: 'bg-amber-50  text-amber-700  ring-1 ring-amber-200',
    rojo:     'bg-red-50    text-red-700    ring-1 ring-red-200',
    sin_datos:'bg-slate-50  text-slate-500  ring-1 ring-slate-200',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[s]}`}>
      <SemaforoIcon s={s} />
      {texto}
    </span>
  )
}

// ─── Caja "Por qué esta métrica" ──────────────────────────────────────────────

function ExplicacionMetrica({
  titulo,
  resumen,
  proceso,
  porque,
  accion,
  formula,
  numero,
}: {
  titulo: string
  resumen: string
  proceso: string
  porque: string
  accion: string
  formula: string
  numero?: string
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50/80 flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {numero && (
              <span className="text-[9px] font-mono font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0 select-none">
                {numero}
              </span>
            )}
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{titulo}</p>
          </div>
          <p className="text-sm text-slate-700 leading-snug">{resumen}</p>
        </div>
        <button
          onClick={() => setAbierto(!abierto)}
          className="shrink-0 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors mt-0.5"
        >
          {abierto ? 'Ocultar' : 'Cómo usarlo'}
          {abierto ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>
      {abierto && (
        <div className="border-t border-slate-200 px-4 py-3 bg-blue-50/40 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <p className="font-semibold text-slate-600">¿Qué está midiendo?</p>
              <p className="text-slate-500 leading-relaxed">{proceso}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-600">¿Por qué importa?</p>
              <p className="text-slate-500 leading-relaxed">{porque}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-600">¿Qué hacer si está en rojo?</p>
              <p className="text-slate-500 leading-relaxed">{accion}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-blue-100">
            <p className="text-[10px] text-blue-600 font-mono leading-relaxed">{formula}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PPI-E2E · Tiempo de Ciclo del Incidente ──────────────────────────────────

const SEMAFORO_COLORES: Record<Semaforo, { barra: string; bg: string; text: string; border: string }> = {
  verde:    { barra: 'bg-emerald-400', bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  amarillo: { barra: 'bg-amber-400',   bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200'   },
  rojo:     { barra: 'bg-red-400',     bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200'     },
  sin_datos:{ barra: 'bg-slate-300',   bg: 'bg-slate-50',    text: 'text-slate-500',   border: 'border-slate-200'   },
}

function TarjetaTciPrioridad({ item }: { item: TciPorPrioridad }) {
  const col = SEMAFORO_COLORES[item.semaforo]
  return (
    <div className={`rounded-xl border p-4 ${col.bg} ${col.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-600">{item.prioridad}</span>
        <SemaforoIcon s={item.semaforo} />
      </div>
      <div className={`text-3xl font-bold tabular-nums ${col.text}`}>{item.promedioDias}d</div>
      <p className="text-xs text-slate-400 mt-0.5">{item.count} incidente{item.count !== 1 ? 's' : ''}</p>
      <div className="mt-2 pt-2 border-t border-white/60 text-[10px] text-slate-400 space-y-0.5">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Verde: ≤{item.umbralVerde}d</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Amarillo: ≤{item.umbralAmarillo}d</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{'Rojo: >'}{item.umbralAmarillo}d</span>
      </div>
    </div>
  )
}

function BarraCategorias({ items }: { items: TciPorCategoria[] }) {
  if (!items.length) return <p className="text-sm text-slate-400 py-4 text-center">Sin datos</p>
  const max = Math.max(...items.map(i => i.promedioDias), 1)
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.categoria} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-24 shrink-0 truncate">{item.categoria}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2 transition-all"
              style={{ width: `${(item.promedioDias / max) * 100}%` }}
            >
              {item.promedioDias > 3 && (
                <span className="text-[10px] font-bold text-white">{item.promedioDias}d</span>
              )}
            </div>
          </div>
          <span className="text-xs text-slate-400 w-10 text-right tabular-nums">{item.count}</span>
        </div>
      ))}
    </div>
  )
}

function TendenciaMensual({ data, semaforoUmbral }: { data: TciData['tendenciaMensual']; semaforoUmbral: number }) {
  if (!data.length) return <p className="text-sm text-slate-400 py-4 text-center">Sin datos suficientes</p>
  const max = Math.max(...data.map(d => d.promedioDias), 1)
  return (
    <div className="space-y-1.5">
      {data.map(item => {
        const s: Semaforo = item.promedioDias <= semaforoUmbral ? 'verde'
          : item.promedioDias <= semaforoUmbral * 1.5 ? 'amarillo' : 'rojo'
        const col = SEMAFORO_COLORES[s]
        return (
          <div key={item.mes} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-12 shrink-0 tabular-nums">{item.label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
              <div
                className={`h-full ${col.barra} rounded-full flex items-center justify-end pr-2 transition-all`}
                style={{ width: `${Math.max((item.promedioDias / max) * 100, 8)}%` }}
              >
                <span className="text-[10px] font-bold text-white">{item.promedioDias}d</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 w-14 text-right tabular-nums">{item.count} inc.</span>
          </div>
        )
      })}
    </div>
  )
}

function TciMetrica({ data }: { data: TciData }) {
  const colGlobal = SEMAFORO_COLORES[data.semaforoGlobal]
  const umbralTendencia = 30 // días — umbral "verde" global

  return (
    <div className="space-y-5">

      {/* Explicación */}
      <ExplicacionMetrica
        numero="01"
        titulo="PPI-E2E · Tiempo de Ciclo del Incidente (TCI)"
        resumen="¿Cuánto tarda en resolverse un incidente? Mide el tiempo real entre que el cliente reporta el problema y que se cierra. Cuanto más bajo, más rápido llega la solución."
        proceso="Ciclo completo de atención al cliente: desde que el cliente reporta un problema hasta que el incidente queda cerrado y resuelto. Es el PPI ancla del sistema — todos los demás indicadores son sub-componentes de este."
        porque="Sin este indicador, la organización no sabe si está cumpliendo los tiempos de servicio comprometidos. Un TCI elevado impacta directamente en la satisfacción del cliente y en la reputación del servicio. La desagregación por prioridad es crítica: un promedio global puede ocultar que los urgentes tardan demasiado."
        accion="🔴 Rojo → activar análisis de subprocesos para identificar en qué etapa se pierde el tiempo. El TCI diagnostica el síntoma; los PPIs de subproceso (Tasa de Reasignación, Tiempo de Presupuesto, etc.) identifican la causa raíz."
        formula="TCI = (fecha_cierre − fecha_registro) en días · Promedio por período · Fuente: tabla incidentes"
      />

      {/* KPI Global */}
      <div className={`rounded-2xl border-2 p-6 flex items-center justify-between ${colGlobal.bg} ${colGlobal.border}`}>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Promedio Global TCI</p>
          <div className={`text-5xl font-bold tabular-nums ${colGlobal.text}`}>
            {data.promedioDiasGlobal !== null ? `${data.promedioDiasGlobal}d` : '—'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {data.totalIncidentesConCierre} incidente{data.totalIncidentesConCierre !== 1 ? 's' : ''} con cierre registrado
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SemaforoBadge
            s={data.semaforoGlobal}
            texto={
              data.semaforoGlobal === 'verde'    ? 'Dentro del objetivo' :
              data.semaforoGlobal === 'amarillo' ? 'Revisar proceso' :
              data.semaforoGlobal === 'rojo'     ? 'Acción correctiva' :
              'Sin datos'
            }
          />
          <div className="flex items-center gap-4 text-[10px] text-slate-400 mt-1">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Verde: ≤30d</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Amarillo: ≤45d</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{'Rojo: >45d'}</span>
          </div>
        </div>
      </div>

      {/* Desglose por Prioridad */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            TCI por Nivel de Prioridad
          </CardTitle>
          <p className="text-xs text-slate-400">Cada prioridad tiene umbrales propios. Un incidente urgente tiene tolerancia menor que uno normal.</p>
        </CardHeader>
        <CardContent>
          {data.porPrioridad.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Sin datos suficientes</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.porPrioridad.map(item => (
                <TarjetaTciPrioridad key={item.prioridad} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Desglose por Categoría + Tendencia mensual */}
      <div className="grid lg:grid-cols-2 gap-5">

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Tag className="h-4 w-4 text-slate-400" />
              TCI por Categoría de Incidente
            </CardTitle>
            <p className="text-xs text-slate-400">Las categorías con mayor TCI son las que más demoran el cierre. Identifican dónde enfocar la mejora técnica.</p>
          </CardHeader>
          <CardContent>
            <BarraCategorias items={data.porCategoria} />
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              Tendencia Mensual del TCI
            </CardTitle>
            <p className="text-xs text-slate-400">Últimos 12 meses. Color indica si ese mes el promedio estuvo dentro del objetivo.</p>
          </CardHeader>
          <CardContent>
            <TendenciaMensual data={data.tendenciaMensual} semaforoUmbral={umbralTendencia} />
          </CardContent>
        </Card>

      </div>

    </div>
  )
}

// ─── CB-1 · Distribución WIP por Etapa ───────────────────────────────────────

const RESPONSABLE_COLOR: Record<string, string> = {
  'Administración': 'bg-blue-100 text-blue-700',
  'Técnico':        'bg-emerald-100 text-emerald-700',
  'Cliente':        'bg-amber-100 text-amber-700',
}

function FilaWip({ etapa, max }: { etapa: WipEtapa; max: number }) {
  return (
    <div className={`rounded-xl p-3 border transition-all ${etapa.esAlerta ? 'border-red-200 bg-red-50/40' : 'border-slate-100 bg-white'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {etapa.esCuello && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
              <Zap className="h-2.5 w-2.5" /> Cuello
            </span>
          )}
          <span className="text-sm font-medium text-slate-700 truncate">{etapa.nombre}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RESPONSABLE_COLOR[etapa.responsable] ?? 'bg-slate-100 text-slate-500'}`}>
            {etapa.responsable}
          </span>
          <span className="text-sm font-bold text-slate-800 tabular-nums w-6 text-right">{etapa.count}</span>
          <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{etapa.porcentaje}%</span>
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${etapa.esAlerta ? 'bg-red-400' : etapa.colorBarra}`}
          style={{ width: `${Math.max((etapa.count / max) * 100, 4)}%` }}
        />
      </div>
    </div>
  )
}

function WipMetrica({ data }: { data: WipData }) {
  const max = Math.max(...(data.etapas.map(e => e.count)), 1)
  const tieneCuellos = data.cuellosIdentificados.length > 0

  return (
    <div className="space-y-5">

      <ExplicacionMetrica
        numero="03"
        titulo="CB-1 · Distribución WIP por Etapa — Cuello de Botella"
        resumen="¿Dónde se está acumulando el trabajo? Muestra cuántos incidentes están parados en cada etapa. El pico más alto es el cuello de botella que frena al resto del proceso."
        proceso="Gestión de la capacidad operativa en tiempo real. Muestra cuántos incidentes activos hay en cada etapa del proceso ahora mismo, identificando dónde se acumula el trabajo y quién es el responsable de desbloquear."
        porque="Concepto directo del ejercicio Sub Shop (U1): la capacidad del sistema está determinada por su cuello de botella. Sin saber dónde se acumulan los incidentes, el admin no sabe dónde intervenir. Una etapa con >40% del WIP total es una señal de alarma que requiere acción inmediata. La Ley de Little permite proyectar el tiempo de ciclo: TC = WIP ÷ Throughput."
        accion="🔴 Etapa en alerta → intervenir específicamente ahí (no en otras etapas — no mejora la capacidad total). Administración bloqueada: revisar carga del admin. Técnico bloqueado: redistribuir asignaciones. Cliente bloqueado: enviar recordatorio."
        formula="WIP = Incidentes con estado ≠ finalizado/resuelto · Ley de Little: TC proyectado = WIP ÷ Throughput (inc/día) · Fuente: tabla incidentes + relaciones"
      />

      {/* Resumen superior */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* WIP Total */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">WIP Total Activo</p>
          <div className="text-4xl font-bold text-slate-800 tabular-nums">{data.totalWip}</div>
          <p className="text-xs text-slate-400 mt-1">incidentes en curso ahora mismo</p>
        </div>

        {/* Throughput Rate */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Throughput (últimos 30d)</p>
          <div className="text-4xl font-bold text-blue-700 tabular-nums">
            {data.throughputRate !== null ? `${data.throughputRate}` : '—'}
          </div>
          <p className="text-xs text-slate-400 mt-1">incidentes resueltos por día</p>
        </div>

        {/* TC Proyectado — Ley de Little */}
        <div className={`rounded-xl border p-5 ${
          data.tiempoCicloProyectado === null ? 'border-slate-200 bg-slate-50' :
          data.tiempoCicloProyectado <= 30 ? 'border-emerald-200 bg-emerald-50' :
          data.tiempoCicloProyectado <= 45 ? 'border-amber-200 bg-amber-50' :
          'border-red-200 bg-red-50'
        }`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">TC Proyectado (Ley de Little)</p>
          <div className={`text-4xl font-bold tabular-nums ${
            data.tiempoCicloProyectado === null ? 'text-slate-400' :
            data.tiempoCicloProyectado <= 30 ? 'text-emerald-700' :
            data.tiempoCicloProyectado <= 45 ? 'text-amber-700' : 'text-red-700'
          }`}>
            {data.tiempoCicloProyectado !== null ? `${data.tiempoCicloProyectado}d` : '—'}
          </div>
          <p className="text-xs text-slate-400 mt-1">WIP ÷ Throughput Rate</p>
        </div>

      </div>

      {/* Alerta de cuello */}
      {tieneCuellos && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {data.cuellosIdentificados.length === 1 ? 'Cuello de botella detectado' : `${data.cuellosIdentificados.length} cuellos detectados`}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {data.cuellosIdentificados.join(' · ')} acumulan el 40%+ del WIP total. Intervenir aquí maximiza el impacto.
            </p>
          </div>
        </div>
      )}

      {/* Distribución por etapa */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            <Gauge className="h-4 w-4 text-slate-400" />
            WIP por Etapa del Proceso
          </CardTitle>
          <div className="flex items-center gap-4 mt-1 text-[10px]">
            <span className="flex items-center gap-1 font-semibold text-blue-700"><span className="w-2 h-2 rounded-full bg-blue-100 border border-blue-300 inline-block" />Administración</span>
            <span className="flex items-center gap-1 font-semibold text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-100 border border-emerald-300 inline-block" />Técnico</span>
            <span className="flex items-center gap-1 font-semibold text-amber-700"><span className="w-2 h-2 rounded-full bg-amber-100 border border-amber-300 inline-block" />Cliente</span>
            <span className="flex items-center gap-1 font-semibold text-red-700 ml-2"><Zap className="h-3 w-3" />Cuello (&gt;40% WIP)</span>
          </div>
        </CardHeader>
        <CardContent>
          {data.etapas.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">No hay incidentes activos en este momento</p>
              <p className="text-xs text-slate-400">WIP = 0</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.etapas.map(etapa => (
                <FilaWip key={etapa.id} etapa={etapa} max={max} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ley de Little explicada */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-2">
        <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" /> Ley de Little aplicada al sistema
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>TC = WIP ÷ Throughput Rate.</strong> Si el WIP sube de {data.totalWip} a {data.totalWip > 0 ? Math.round(data.totalWip * 1.6) : '—'} incidentes con el mismo throughput, el tiempo de ciclo proyectado sube proporcionalmente. Reducir el WIP (desbloqueando el cuello de botella) o aumentar el throughput reduce el TC automáticamente — sin necesidad de trabajar más rápido en todas las etapas.
        </p>
      </div>

    </div>
  )
}

// ─── SP2-B · Tasa de Reasignación ────────────────────────────────────────────

function FilaTecnicoReasig({ t, max }: { t: ReasignacionPorTecnico; max: number }) {
  const col = SEMAFORO_COLORES[t.semaforo]
  const nombreCompleto = `${t.nombre} ${t.apellido}`.trim()
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${col.bg} ${col.border}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">{nombreCompleto}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SemaforoIcon s={t.semaforo} />
          <span className={`text-lg font-bold tabular-nums ${col.text}`}>{t.tasaProblema}%</span>
        </div>
      </div>
      <div className="w-full bg-white/70 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${col.barra}`}
          style={{ width: `${Math.max((t.tasaProblema / max) * 100, 4)}%` }}
        />
      </div>
      <div className="flex gap-3 text-[10px] text-slate-500">
        <span>{t.totalAsignaciones} asignaciones</span>
        {t.rechazadas > 0 && <span className="text-amber-600">{t.rechazadas} rechazadas</span>}
        {t.canceladas  > 0 && <span className="text-red-600">{t.canceladas} canceladas</span>}
      </div>
    </div>
  )
}

function ReasignacionMetrica({ data }: { data: ReasignacionData }) {
  const colGlobal = SEMAFORO_COLORES[data.semaforoGlobal]
  const maxTasaTecnico = Math.max(...(data.porTecnico.map(t => t.tasaProblema)), 1)
  const maxCatCount    = Math.max(...(data.porCategoria.map(c => c.tasa)), 1)

  return (
    <div className="space-y-5">

      <ExplicacionMetrica
        numero="04"
        titulo="SP2-B · Tasa de Reasignación — LEAN Waste #6"
        resumen="¿Con qué frecuencia hay que reasignar un trabajo? Cada vez que un técnico rechaza o abandona una asignación, el cliente espera más y el admin tiene que empezar de cero."
        proceso="Calidad del proceso de asignación inicial (SP2). Mide qué porcentaje de incidentes necesitaron más de una asignación para quedar atendidos, ya sea porque el técnico rechazó antes de aceptar o canceló después de aceptar."
        porque="LEAN Waste #6 — Reprocesamiento: cada reasignación es un ciclo de trabajo que no agrega valor al cliente. Una tasa alta indica que el proceso de matching técnico-incidente está fallando: puede ser por sobrecarga del técnico, mala distribución de especialidades, o falta de información al asignar. El costo es triple: tiempo extra para el cliente, carga extra para el admin, y desgaste del técnico."
        accion="🔴 Tasa global alta → analizar desglose por técnico (¿quién genera más rechazos?) y por categoría (¿qué especialidades tienen escasez?). Por técnico alto → conversación de gestión o redistribución. Por categoría alta → contratar o capacitar técnicos en esa especialidad."
        formula="TR = (Incidentes con al menos 1 rechazo o cancelación / Total incidentes asignados) × 100 · Fuente: asignaciones_tecnico estados rechazada y cancelada"
      />

      {/* KPI Global + Desglose por motivo */}
      <div className="grid sm:grid-cols-3 gap-4">

        <div className={`rounded-2xl border-2 p-5 col-span-1 flex flex-col justify-between ${colGlobal.bg} ${colGlobal.border}`}>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tasa de Reasignación</p>
            <div className={`text-5xl font-bold tabular-nums ${colGlobal.text}`}>
              {data.tasaGlobal !== null ? `${data.tasaGlobal}%` : '—'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {data.totalConReasignacion} de {data.totalIncidentesAsignados} incidentes
            </p>
          </div>
          <div className="mt-4 space-y-1.5">
            <SemaforoBadge
              s={data.semaforoGlobal}
              texto={
                data.semaforoGlobal === 'verde'    ? 'Matching eficiente' :
                data.semaforoGlobal === 'amarillo' ? 'Revisar asignación' :
                data.semaforoGlobal === 'rojo'     ? 'Proceso con retrabajo' :
                'Sin datos'
              }
            />
            <div className="flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{'Verde: ≤10%'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{'≤25%'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{'>25%'}
              </span>
            </div>
          </div>
        </div>

        {/* Desglose por motivo */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 col-span-2 space-y-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Desglose por motivo
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-amber-200 p-4">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Rechazadas por técnico</p>
              <p className="text-3xl font-bold text-amber-700 tabular-nums">{data.motivoDesglose.rechazadas}</p>
              <p className="text-xs text-slate-400 mt-1">El técnico no quiso tomar el trabajo</p>
              <p className="text-[10px] text-amber-600 mt-1 italic">Causa: sobrecarga, distancia, especialidad</p>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-4">
              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1">Canceladas por técnico</p>
              <p className="text-3xl font-bold text-red-700 tabular-nums">{data.motivoDesglose.canceladas}</p>
              <p className="text-xs text-slate-400 mt-1">El técnico aceptó y luego abandonó</p>
              <p className="text-[10px] text-red-600 mt-1 italic">Más grave: cliente ya esperaba respuesta</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Las cancelaciones son más dañinas que los rechazos: el cliente ya había recibido confirmación de que alguien lo iba a atender.
          </p>
        </div>
      </div>

      {/* Por técnico + Por categoría */}
      <div className="grid lg:grid-cols-2 gap-5">

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Wrench className="h-4 w-4 text-slate-400" />
              Tasa de Problema por Técnico
            </CardTitle>
            <p className="text-xs text-slate-400">Suma de rechazos + cancelaciones sobre el total de asignaciones recibidas. Un técnico con tasa alta requiere análisis de causa raíz inmediato.</p>
          </CardHeader>
          <CardContent>
            {data.porTecnico.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {data.porTecnico.slice(0, 8).map(t => (
                  <FilaTecnicoReasig key={t.id_tecnico} t={t} max={maxTasaTecnico} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Tag className="h-4 w-4 text-slate-400" />
              Tasa de Reasignación por Categoría
            </CardTitle>
            <p className="text-xs text-slate-400">Las categorías con mayor tasa indican escasez de técnicos especializados o dificultad para cubrir esa especialidad.</p>
          </CardHeader>
          <CardContent>
            {data.porCategoria.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {data.porCategoria.map(cat => {
                  const s: Semaforo = cat.tasa <= 10 ? 'verde' : cat.tasa <= 25 ? 'amarillo' : 'rojo'
                  const col = SEMAFORO_COLORES[s]
                  return (
                    <div key={cat.categoria} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-24 shrink-0 truncate">{cat.categoria}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full ${col.barra} rounded-full flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(cat.tasa, 6)}%` }}
                        >
                          {cat.tasa >= 10 && <span className="text-[9px] font-bold text-white">{cat.tasa}%</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 w-16 text-right tabular-nums">
                        {cat.conReasignacion}/{cat.totalAsignados}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Tendencia mensual */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            Evolución Mensual de la Tasa de Reasignación
          </CardTitle>
          <p className="text-xs text-slate-400">Una tendencia decreciente indica que el proceso de asignación está mejorando. Un pico puede correlacionarse con un técnico problemático o una categoría saturada en ese mes.</p>
        </CardHeader>
        <CardContent>
          {data.tendenciaMensual.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Sin datos suficientes</p>
          ) : (
            <div className="space-y-2">
              {data.tendenciaMensual.map(item => {
                const s: Semaforo = item.tasa <= 10 ? 'verde' : item.tasa <= 25 ? 'amarillo' : 'rojo'
                const col = SEMAFORO_COLORES[s]
                return (
                  <div key={item.mes} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-12 shrink-0">{item.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div
                        className={`h-full ${col.barra} rounded-full flex items-center justify-end pr-2 transition-all`}
                        style={{ width: `${Math.max(item.tasa, 5)}%` }}
                      >
                        <span className="text-[10px] font-bold text-white">{item.tasa}%</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 w-20 text-right tabular-nums">
                      {item.conReasignacion}/{item.totalAsignados} inc.
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

// ─── SP7 · Tasa de Conformidades Rechazadas (TCR) ─────────────────────────────

function FilaTecnicoTcr({ t, max }: { t: TcrPorTecnico; max: number }) {
  const col = SEMAFORO_COLORES[t.semaforo]
  const nombre = `${t.nombre} ${t.apellido}`.trim()
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${col.bg} ${col.border}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">{nombre}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SemaforoIcon s={t.semaforo} />
          <span className={`text-lg font-bold tabular-nums ${col.text}`}>{t.tasa}%</span>
        </div>
      </div>
      <div className="w-full bg-white/70 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${col.barra}`}
          style={{ width: `${Math.max((t.tasa / max) * 100, 4)}%` }}
        />
      </div>
      <div className="flex gap-3 text-[10px] text-slate-500">
        <span>{t.totalConformidades} conformidades</span>
        <span className="text-red-600">{t.rechazadas} rechazada{t.rechazadas !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

function TcrMetrica({ data }: { data: TcrData }) {
  const colGlobal = SEMAFORO_COLORES[data.semaforoGlobal]
  const maxTasaTecnico = Math.max(...(data.porTecnico.map(t => t.tasa)), 1)

  return (
    <div className="space-y-5">

      <ExplicacionMetrica
        numero="05"
        titulo="SP7 · Tasa de Conformidades Rechazadas (TCR) — Calidad Técnica"
        resumen="¿Cuántas veces el admin rechaza el trabajo presentado por el técnico? Es la medida más directa de calidad: cada rechazo significa que el trabajo hay que rehacerlo."
        proceso="Calidad de ejecución del trabajo técnico (SP7 — Conformidad y Cierre). Mide cuántas veces el administrador considera que el trabajo presentado por el técnico no cumple con el estándar para ser aprobado."
        porque="Es el equivalente al DPMO (Defectos Por Millón de Oportunidades) de Six Sigma aplicado a servicios: mide defectos de calidad directamente en el output final. Cada rechazo genera Waste #6 LEAN (Reprocesamiento): el técnico debe rehacer o corregir el trabajo, el cliente sigue esperando y el admin duplica su revisión. Una TCR alta es la señal de alerta más directa de fallas técnicas o de comunicación."
        accion="🔴 Técnico con TCR > 15% → auditoría de trabajos anteriores, plan de capacitación técnica, acompañamiento en próximos trabajos. 🟡 5–15% → monitoreo mensual con retroalimentación. Si el rechazo es sistémico en todos los técnicos → revisar criterios de aprobación o calidad de las instrucciones operativas."
        formula="TCR = (Conformidades con esta_rechazada = true / Total conformidades enviadas) × 100 · Fuente: conformidades.esta_rechazada · Semáforo: Verde < 5% | Amarillo 5–15% | Rojo > 15%"
      />

      {/* KPI Global + Contexto */}
      <div className="grid sm:grid-cols-3 gap-4">

        <div className={`rounded-2xl border-2 p-5 col-span-1 flex flex-col justify-between ${colGlobal.bg} ${colGlobal.border}`}>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tasa Global TCR</p>
            <div className={`text-5xl font-bold tabular-nums ${colGlobal.text}`}>
              {data.tasaGlobal !== null ? `${data.tasaGlobal}%` : '—'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {data.totalRechazadas} rechazadas de {data.totalConformidades} conformidades
            </p>
          </div>
          <div className="mt-4 space-y-1.5">
            <SemaforoBadge
              s={data.semaforoGlobal}
              texto={
                data.semaforoGlobal === 'verde'    ? 'Calidad aceptable' :
                data.semaforoGlobal === 'amarillo' ? 'Revisar técnicos' :
                data.semaforoGlobal === 'rojo'     ? 'Calidad crítica' :
                'Sin datos'
              }
            />
            <div className="flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{'Verde: <5%'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{'5–15%'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{'>15%'}
              </span>
            </div>
          </div>
        </div>

        {/* Qué significa un rechazo */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 col-span-2 space-y-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-red-400" /> Impacto de cada rechazo
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-red-100 p-3 text-center space-y-1">
              <p className="text-2xl font-bold text-red-600 tabular-nums">{data.totalRechazadas}</p>
              <p className="text-[10px] text-slate-500 leading-tight">Conformidades rechazadas en total</p>
            </div>
            <div className="bg-white rounded-xl border border-amber-100 p-3 text-center space-y-1">
              <p className="text-2xl font-bold text-amber-600 tabular-nums">
                {data.totalConformidades > 0 ? Math.max(data.totalConformidades - data.totalRechazadas, 0) : '—'}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">Aprobadas sin retrabajo</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center space-y-1">
              <p className="text-2xl font-bold text-slate-600 tabular-nums">{data.totalConformidades}</p>
              <p className="text-[10px] text-slate-500 leading-tight">Total enviadas al sistema</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic leading-relaxed">
            Cada rechazo representa un ciclo de retrabajo completo: el técnico debe corregir y reenviar, el cliente prolonga su espera y el administrador repite la revisión. En LEAN es Waste #6 — Reprocesamiento puro.
          </p>
        </div>
      </div>

      {/* Por técnico (sección crítica) + Por categoría */}
      <div className="grid lg:grid-cols-2 gap-5">

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Wrench className="h-4 w-4 text-slate-400" />
              TCR por Técnico
            </CardTitle>
            <p className="text-xs text-slate-400">
              Desagregación crítica: permite identificar si el problema es individual (un técnico en particular) o sistémico (todos los técnicos). Un técnico con TCR &gt; 15% requiere acción inmediata.
            </p>
          </CardHeader>
          <CardContent>
            {data.porTecnico.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {data.porTecnico.slice(0, 8).map(t => (
                  <FilaTecnicoTcr key={t.id_tecnico} t={t} max={maxTasaTecnico} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Tag className="h-4 w-4 text-slate-400" />
              TCR por Categoría
            </CardTitle>
            <p className="text-xs text-slate-400">
              Las categorías con mayor tasa indican que ese tipo de trabajo tiene mayor dificultad técnica o criterios de aprobación más estrictos. Útil para focalizar capacitaciones.
            </p>
          </CardHeader>
          <CardContent>
            {data.porCategoria.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {data.porCategoria.map(cat => {
                  const s: Semaforo = cat.tasa < 5 ? 'verde' : cat.tasa <= 15 ? 'amarillo' : 'rojo'
                  const col = SEMAFORO_COLORES[s]
                  return (
                    <div key={cat.categoria} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-24 shrink-0 truncate">{cat.categoria}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full ${col.barra} rounded-full flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(cat.tasa, 5)}%` }}
                        >
                          {cat.tasa >= 8 && <span className="text-[9px] font-bold text-white">{cat.tasa}%</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 w-16 text-right tabular-nums">
                        {cat.rechazadas}/{cat.totalConformidades}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Tendencia mensual */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            Evolución Mensual de la TCR
          </CardTitle>
          <p className="text-xs text-slate-400">
            Una tendencia decreciente confirma que las acciones correctivas están funcionando. Una suba sostenida por 2 o más meses es señal de alerta: revisar cambios en el equipo técnico o en los criterios de aprobación.
          </p>
        </CardHeader>
        <CardContent>
          {data.tendenciaMensual.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Sin datos suficientes</p>
          ) : (
            <div className="space-y-2">
              {data.tendenciaMensual.map(item => {
                const s: Semaforo = item.tasa < 5 ? 'verde' : item.tasa <= 15 ? 'amarillo' : 'rojo'
                const col = SEMAFORO_COLORES[s]
                return (
                  <div key={item.mes} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-12 shrink-0">{item.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div
                        className={`h-full ${col.barra} rounded-full flex items-center justify-end pr-2 transition-all`}
                        style={{ width: `${Math.max(item.tasa, 5)}%` }}
                      >
                        <span className="text-[10px] font-bold text-white">{item.tasa}%</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 w-24 text-right tabular-nums">
                      {item.rechazadas}/{item.totalConformidades} conf.
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

// ─── SP8-A/B · Deuda Pendiente de Cobros y Pagos ─────────────────────────────

function formatPesos(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

function TramoBadge({ tramo }: { tramo: Sp8ItemPendiente['tramo'] }) {
  const styles = {
    '0-7':  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    '7-15': 'bg-amber-50  text-amber-700  ring-1 ring-amber-200',
    '>15':  'bg-red-50    text-red-700    ring-1 ring-red-200',
  }
  const labels = { '0-7': '0-7d', '7-15': '7-15d', '>15': '>15d' }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${styles[tramo]}`}>
      {labels[tramo]}
    </span>
  )
}

function PanelDeuda({
  titulo,
  subtitulo,
  monto,
  count,
  semaforo,
  porTramo,
  pendientes,
  colorAccent,
}: {
  titulo: string
  subtitulo: string
  monto: number
  count: number
  semaforo: Semaforo
  porTramo: Sp8Data['dpcPorTramo']
  pendientes: Sp8ItemPendiente[]
  colorAccent: 'blue' | 'purple'
}) {
  const col = SEMAFORO_COLORES[semaforo]
  const accentBorder = colorAccent === 'blue' ? 'border-blue-200' : 'border-purple-200'
  const accentBg    = colorAccent === 'blue' ? 'bg-blue-50'     : 'bg-purple-50'
  const accentText  = colorAccent === 'blue' ? 'text-blue-700'  : 'text-purple-700'

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className={`rounded-2xl border-2 p-5 flex flex-col gap-3 ${col.bg} ${col.border}`}>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{titulo}</p>
          <p className="text-xs text-slate-400">{subtitulo}</p>
        </div>
        <div className={`text-3xl font-bold tabular-nums ${col.text}`}>
          {formatPesos(monto)}
        </div>
        <div className="flex items-center justify-between">
          <SemaforoBadge
            s={semaforo}
            texto={
              semaforo === 'verde'    ? `0 pendientes` :
              semaforo === 'amarillo' ? `${count} pendientes` :
              semaforo === 'rojo'     ? `${count} pendientes — revisar` :
              'Sin datos'
            }
          />
          <div className="flex gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />0</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />1–5</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{'>5'}</span>
          </div>
        </div>
      </div>

      {/* Antigüedad */}
      <div className={`rounded-xl border p-4 space-y-3 ${accentBg} ${accentBorder}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${accentText}`}>Distribución por antigüedad</p>
        <div className="grid grid-cols-3 gap-2">
          {porTramo.map((t, i) => {
            const tramoBg    = i === 0 ? 'bg-white border-emerald-200' : i === 1 ? 'bg-white border-amber-200' : 'bg-white border-red-200'
            const tramoText  = i === 0 ? 'text-emerald-700' : i === 1 ? 'text-amber-700' : 'text-red-700'
            return (
              <div key={t.label} className={`rounded-xl border p-3 text-center space-y-1 ${tramoBg}`}>
                <p className={`text-xl font-bold tabular-nums ${tramoText}`}>{t.count}</p>
                <p className="text-[9px] font-semibold text-slate-500 uppercase leading-tight">{t.label}</p>
                {t.monto > 0 && <p className="text-[9px] text-slate-400">{formatPesos(t.monto)}</p>}
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-400 italic">
          Los items en tramo {'>'}15 días requieren acción inmediata — contacto proactivo o revisión del proceso de cierre.
        </p>
      </div>

      {/* Lista pendientes */}
      {pendientes.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <User className="h-4 w-4 text-slate-400" />
              Pendientes ({count})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {pendientes.slice(0, 10).map(it => (
                <div key={it.id_presupuesto} className="flex items-center gap-2 text-xs py-1 border-b border-slate-50 last:border-0">
                  <TramoBadge tramo={it.tramo} />
                  <span className="flex-1 text-slate-600 truncate">{it.nombre} {it.apellido}</span>
                  <span className="text-slate-400 tabular-nums shrink-0">{it.diasPendiente}d</span>
                  <span className="font-semibold text-slate-700 tabular-nums shrink-0">{formatPesos(it.monto)}</span>
                </div>
              ))}
              {pendientes.length > 10 && (
                <p className="text-[10px] text-slate-400 text-center pt-1">
                  +{pendientes.length - 10} más
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {pendientes.length === 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-sm font-semibold text-emerald-700">Sin deuda pendiente</p>
          <p className="text-xs text-emerald-600 mt-0.5">Todos los registros están al día</p>
        </div>
      )}
    </div>
  )
}

function Sp8Metrica({ data }: { data: Sp8Data }) {
  return (
    <div className="space-y-5">

      <ExplicacionMetrica
        numero="06"
        titulo="SP8-A/B · Deuda Pendiente de Cobros y Pagos — Costo de Oportunidad"
        resumen="¿Cuánto dinero está trabado? Muestra lo que ya se trabajó pero todavía no se cobró al cliente (DPC), y lo que se le debe a los técnicos por trabajos completados (DPT)."
        proceso="Gestión financiera del cierre del servicio (SP8). SP8-A mide el dinero de trabajos terminados que aún no fue cobrado al cliente. SP8-B mide lo que se le debe al técnico por trabajos con presupuesto aprobado."
        porque="Aplica directamente el Costo de Oportunidad (U1): un trabajo entregado y no cobrado no generó ingreso real — el valor fue creado pero no capturado. Para los técnicos, la demora en el pago genera resistencia al cambio (U3): si el sistema procesa el trabajo pero tarda en pagar, erosiona la confianza del equipo técnico y dificulta la adopción del sistema."
        accion="🔴 DPC con antigüedad >15d → contacto proactivo al cliente, revisar el flujo de cierre financiero. 🔴 DPT con antigüedad >15d → procesar pagos como prioridad antes de asignar nuevos trabajos. Patrón sistémico en ambos → automatizar notificaciones de cobro/pago al aprobarse la conformidad."
        formula="DPC = Σ presupuesto.costo_total donde estado='aprobado' + incidente finalizado + sin registro en cobros_clientes · DPT = Σ (costo_materiales + costo_mano_obra) donde presupuesto='aprobado' + sin registro en pagos_tecnicos"
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <PanelDeuda
          titulo="SP8-A · Deuda de Cobro al Cliente (DPC)"
          subtitulo="Trabajos entregados al cliente sin cobro registrado"
          monto={data.dpcMonto}
          count={data.dpcCount}
          semaforo={data.dpcSemaforo}
          porTramo={data.dpcPorTramo}
          pendientes={data.dpcPendientes}
          colorAccent="blue"
        />
        <PanelDeuda
          titulo="SP8-B · Deuda de Pago al Técnico (DPT)"
          subtitulo="Presupuestos aprobados sin pago al técnico registrado"
          monto={data.dptMonto}
          count={data.dptCount}
          semaforo={data.dptSemaforo}
          porTramo={data.dptPorTramo}
          pendientes={data.dptPendientes}
          colorAccent="purple"
        />
      </div>

    </div>
  )
}

// ─── KPI-1 · Índice de Satisfacción del Cliente (ISC) ────────────────────────

function EstrellasFijas({ valor, max = 5 }: { valor: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const llena = i < Math.floor(valor)
        const media = !llena && i < valor
        return (
          <svg key={i} className={`h-4 w-4 ${llena ? 'text-amber-400' : media ? 'text-amber-300' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      })}
    </span>
  )
}

function FilaTecnicoIsc({ t, max }: { t: IscPorTecnico; max: number }) {
  const col = SEMAFORO_COLORES[t.semaforo]
  const nombre = `${t.nombre} ${t.apellido}`.trim()
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${col.bg} ${col.border}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">{nombre}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <EstrellasFijas valor={t.promedio} />
          <span className={`text-lg font-bold tabular-nums ${col.text}`}>{t.promedio.toFixed(1)}</span>
        </div>
      </div>
      <div className="w-full bg-white/70 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${col.barra}`}
          style={{ width: `${Math.max((t.promedio / max) * 100, 4)}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-500">{t.cantidad} calificación{t.cantidad !== 1 ? 'es' : ''}</p>
    </div>
  )
}

function IscMetrica({ data }: { data: IscData }) {
  const col = SEMAFORO_COLORES[data.semaforoGlobal]
  const maxTecPromedio = Math.max(...(data.porTecnico.map(t => t.promedio)), 5)

  return (
    <div className="space-y-5">

      <ExplicacionMetrica
        numero="07"
        titulo="KPI-1 · Índice de Satisfacción del Cliente (ISC) — Validación Externa"
        resumen="¿Qué tan satisfechos están los clientes? Es la calificación promedio de 1 a 5 que dan al cerrar un incidente. La tendencia mes a mes dice más que el número de hoy."
        proceso="Percepción global del cliente sobre el servicio recibido (KPI de nivel estratégico). Mide si el cliente siente que su problema fue resuelto de manera satisfactoria, más allá de los indicadores internos de proceso."
        porque="Es la validación externa de todos los PPIs: si TCI, FPY y TCR están en verde pero el ISC cae, hay un problema de experiencia que los indicadores internos no capturan (trato, comunicación, gestión de expectativas). La tendencia importa más que el valor puntual — una caída sostenida en 2+ meses es señal de alerta."
        accion="🔴 ISC < 3.5 → cruzar con TCR (calidad técnica) y TCI (demora) para identificar causa raíz. Tiempo correcto pero calificación baja → problema de comunicación o trato del técnico. TCR alto → problema de calidad técnica. 🟡 3.5–4.4 → plan de mejora focalizado en el técnico con menor ISC individual."
        formula="ISC = Promedio(calificaciones.puntuacion) en escala 1–5 · Verde ≥ 4.5 | Amarillo 3.5–4.4 | Rojo < 3.5 · Fuente: calificaciones.puntuacion + calificaciones.resolvio_problema"
      />

      {/* KPI Global + Distribución de estrellas */}
      <div className="grid sm:grid-cols-3 gap-4">

        {/* Score global */}
        <div className={`rounded-2xl border-2 p-5 flex flex-col justify-between col-span-1 ${col.bg} ${col.border}`}>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ISC Global</p>
            <div className={`text-6xl font-bold tabular-nums leading-none ${col.text}`}>
              {data.promedioGlobal !== null ? data.promedioGlobal.toFixed(1) : '—'}
            </div>
            <div className="mt-2">
              {data.promedioGlobal !== null && <EstrellasFijas valor={data.promedioGlobal} />}
            </div>
            <p className="text-xs text-slate-400 mt-1">{data.totalCalificaciones} calificaciones totales</p>
          </div>
          <div className="mt-4 space-y-1.5">
            <SemaforoBadge
              s={data.semaforoGlobal}
              texto={
                data.semaforoGlobal === 'verde'    ? 'Satisfacción alta' :
                data.semaforoGlobal === 'amarillo' ? 'Satisfacción media' :
                data.semaforoGlobal === 'rojo'     ? 'Satisfacción baja' :
                'Sin datos'
              }
            />
            <div className="flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{'≥4.5'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{'3.5–4.4'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{'<3.5'}</span>
            </div>
          </div>
        </div>

        {/* Distribución + Resolvió el problema */}
        <div className="col-span-2 space-y-3">

          {/* Distribución de estrellas */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Distribución de calificaciones</p>
            {data.distribucionEstrellas.slice().reverse().map(item => (
              <div key={item.estrellas} className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 w-20 shrink-0">
                  {Array.from({ length: item.estrellas }).map((_, i) => (
                    <svg key={i} className="h-3 w-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${Math.max(item.porcentaje, item.count > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 tabular-nums w-12 text-right">
                  {item.count} ({item.porcentaje}%)
                </span>
              </div>
            ))}
          </div>

          {/* Resolvió el problema */}
          {(data.resolvioProblema.si + data.resolvioProblema.no) > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 mb-1">¿El cliente sintió que su problema fue resuelto?</p>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> {data.resolvioProblema.si} sí
                  </span>
                  <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                    <XCircle className="h-4 w-4" /> {data.resolvioProblema.no} no
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-2xl font-bold tabular-nums ${data.resolvioProblema.tasa >= 80 ? 'text-emerald-600' : data.resolvioProblema.tasa >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {data.resolvioProblema.tasa}%
                </p>
                <p className="text-[10px] text-slate-400">tasa de resolución percibida</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Por técnico + Por categoría */}
      <div className="grid lg:grid-cols-2 gap-5">

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Wrench className="h-4 w-4 text-slate-400" />
              ISC por Técnico
            </CardTitle>
            <p className="text-xs text-slate-400">
              Ordenado de mayor a menor satisfacción. La diferencia entre técnicos revela variabilidad en la experiencia del cliente que no está explicada por el proceso, sino por las personas.
            </p>
          </CardHeader>
          <CardContent>
            {data.porTecnico.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {data.porTecnico.slice(0, 8).map(t => (
                  <FilaTecnicoIsc key={t.id_tecnico} t={t} max={maxTecPromedio} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Tag className="h-4 w-4 text-slate-400" />
              ISC por Categoría
            </CardTitle>
            <p className="text-xs text-slate-400">
              Categorías con ISC bajo pueden indicar trabajos más complejos, mayor tiempo de resolución o expectativas del cliente más difíciles de gestionar en esa especialidad.
            </p>
          </CardHeader>
          <CardContent>
            {data.porCategoria.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {data.porCategoria.map(cat => {
                  const s: Semaforo = cat.promedio >= 4.5 ? 'verde' : cat.promedio >= 3.5 ? 'amarillo' : 'rojo'
                  const col = SEMAFORO_COLORES[s]
                  return (
                    <div key={cat.categoria} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-24 shrink-0 truncate">{cat.categoria}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full ${col.barra} rounded-full flex items-center justify-end pr-2`}
                          style={{ width: `${(cat.promedio / 5) * 100}%` }}
                        >
                          <span className="text-[9px] font-bold text-white">{cat.promedio.toFixed(1)}</span>
                        </div>
                      </div>
                      <EstrellasFijas valor={cat.promedio} />
                      <span className="text-[10px] text-slate-400 w-8 text-right tabular-nums">{cat.cantidad}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Tendencia mensual */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            Evolución Mensual del ISC
          </CardTitle>
          <p className="text-xs text-slate-400">
            La tendencia es más informativa que el valor puntual. Una caída sostenida por 2 o más meses consecutivos requiere análisis cruzado con TCR y TCI para identificar la causa raíz.
          </p>
        </CardHeader>
        <CardContent>
          {data.tendenciaMensual.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Sin datos suficientes</p>
          ) : (
            <div className="space-y-2">
              {data.tendenciaMensual.map(item => {
                const s: Semaforo = item.promedio >= 4.5 ? 'verde' : item.promedio >= 3.5 ? 'amarillo' : 'rojo'
                const col = SEMAFORO_COLORES[s]
                return (
                  <div key={item.mes} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-12 shrink-0">{item.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div
                        className={`h-full ${col.barra} rounded-full flex items-center justify-end pr-2 transition-all`}
                        style={{ width: `${(item.promedio / 5) * 100}%` }}
                      >
                        <span className="text-[10px] font-bold text-white">{item.promedio.toFixed(1)}</span>
                      </div>
                    </div>
                    <EstrellasFijas valor={item.promedio} />
                    <span className="text-[10px] text-slate-400 w-8 text-right tabular-nums">{item.cantidad}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

// ─── CB-2 · Takt Time del Sistema vs Throughput Rate ─────────────────────────

function Cb2Metrica({ data }: { data: Cb2Data }) {
  const col = SEMAFORO_COLORES[data.semaforoRatio]
  const maxSemana = Math.max(...data.tendenciaSemanal.flatMap(s => [s.nuevos, s.finalizados]), 1)

  return (
    <div className="space-y-5">

      <ExplicacionMetrica
        numero="08"
        titulo="CB-2 · Takt Time del Sistema vs Throughput Rate — Capacidad LEAN"
        resumen="¿El sistema puede con la demanda? Compara cuántos incidentes entran por día contra cuántos se resuelven. Si entran más de los que se cierran, la cola crece en silencio."
        proceso="Planificación de capacidad operativa y detección temprana de saturación. Mide si el sistema está resolviendo incidentes al mismo ritmo al que entran — o si la cola está creciendo de forma invisible pero matemáticamente inevitable."
        porque="Concepto directo del material LEAN (U3): el Takt Time define el ritmo de la demanda. Si el Throughput Rate cae por debajo del Takt Time, la deuda operativa crece cada día aunque todos los indicadores de calidad estén en verde. La Ley de Little (TC = WIP / Throughput) permite proyectar cuántos días tardará el sistema en resolver el backlog actual."
        accion="🔴 Ratio < 85% por 2 semanas → alerta de saturación: revisar si hay categoría creando un pico, si un técnico está fuera de servicio, o si una etapa específica está frenando el throughput. Cruzar con CB-1 (WIP por etapa) para ubicar el cuello de botella."
        formula="Takt Time = Incidentes nuevos / 30 días · Throughput = Incidentes finalizados / 30 días · Ratio de Absorción = (Throughput / Takt) × 100 · TC proyectado = WIP actual / Throughput · Verde >100% | Amarillo 85–100% | Rojo <85%"
      />

      {/* Tres KPIs principales */}
      <div className="grid sm:grid-cols-3 gap-4">

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Takt Time</p>
          <div className="text-4xl font-bold tabular-nums text-slate-700">
            {data.taktTime.toFixed(1)}
          </div>
          <p className="text-xs text-slate-400">inc. nuevos / día (30d)</p>
          <p className="text-[10px] text-slate-400 mt-2 italic">
            {data.totalNuevos30d} incidentes nuevos en 30 días
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Throughput Rate</p>
          <div className="text-4xl font-bold tabular-nums text-slate-700">
            {data.throughputRate.toFixed(1)}
          </div>
          <p className="text-xs text-slate-400">inc. finalizados / día (30d)</p>
          <p className="text-[10px] text-slate-400 mt-2 italic">
            {data.totalFinalizados30d} incidentes cerrados en 30 días
          </p>
        </div>

        <div className={`rounded-2xl border-2 p-5 space-y-1 ${col.bg} ${col.border}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ratio de Absorción</p>
          <div className={`text-4xl font-bold tabular-nums ${col.text}`}>
            {data.taktTime === 0 ? '—' : `${data.ratioAbsorcion}%`}
          </div>
          <p className="text-xs text-slate-400">throughput / takt time</p>
          <div className="mt-2">
            <SemaforoBadge
              s={data.semaforoRatio}
              texto={
                data.semaforoRatio === 'verde'    ? 'Sistema absorbiendo' :
                data.semaforoRatio === 'amarillo' ? 'Equilibrio frágil'  :
                data.semaforoRatio === 'rojo'     ? 'Cola creciendo'     :
                'Sin datos'
              }
            />
          </div>
        </div>

      </div>

      {/* Barra comparativa + Ley de Little */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Comparación visual */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Demanda vs Capacidad (30 días)</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Takt Time (demanda)</span>
                <span className="font-semibold text-slate-700">{data.taktTime.toFixed(1)} inc/día</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full"
                  style={{ width: `${Math.min((data.taktTime / Math.max(data.taktTime, data.throughputRate)) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Throughput (capacidad)</span>
                <span className="font-semibold text-slate-700">{data.throughputRate.toFixed(1)} inc/día</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full ${col.barra}`}
                  style={{ width: `${Math.min((data.throughputRate / Math.max(data.taktTime, data.throughputRate)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            {data.ratioAbsorcion >= 100
              ? 'El sistema está resolviendo más de lo que entra — margen de capacidad positivo.'
              : `El sistema absorbe el ${data.ratioAbsorcion}% de la demanda — ${100 - data.ratioAbsorcion}% queda en cola.`}
          </p>
        </div>

        {/* Ley de Little */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" /> Ley de Little — TC Proyectado
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-indigo-100 p-3 text-center space-y-1">
              <p className="text-2xl font-bold text-indigo-700 tabular-nums">{data.wipActual}</p>
              <p className="text-[10px] text-slate-500 leading-tight">WIP actual (inc. en curso)</p>
            </div>
            <div className="bg-white rounded-xl border border-indigo-100 p-3 text-center space-y-1">
              <p className="text-2xl font-bold text-indigo-700 tabular-nums">
                {data.tcProyectado !== null ? `${data.tcProyectado}d` : '—'}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">TC proyectado (WIP / Throughput)</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic leading-relaxed">
            Ley de Little: TC = WIP / Throughput Rate. Si el WIP sube con el mismo throughput, el tiempo de ciclo sube automáticamente — sin que nadie trabaje más lento.
          </p>
        </div>

      </div>

      {/* Tendencia semanal */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            Nuevos vs Finalizados — Tendencia Semanal (8 semanas)
          </CardTitle>
          <p className="text-xs text-slate-400">
            Semanas donde la barra azul supera la verde indican acumulación de backlog. Un patrón sostenido de barras azules más altas es la señal más temprana de saturación operativa.
          </p>
        </CardHeader>
        <CardContent>
          {data.tendenciaSemanal.every(s => s.nuevos === 0 && s.finalizados === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">Sin datos suficientes</p>
          ) : (
            <div className="space-y-3">
              {/* Leyenda */}
              <div className="flex gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-slate-400 inline-block" />Nuevos (demanda)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-emerald-400 inline-block" />Finalizados (throughput)</span>
              </div>
              {data.tendenciaSemanal.map(sem => (
                <div key={sem.label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-12 shrink-0 tabular-nums">{sem.label}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex gap-1 items-center">
                      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-slate-400 rounded-full"
                          style={{ width: `${Math.max((sem.nuevos / maxSemana) * 100, sem.nuevos > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 tabular-nums w-4 text-right">{sem.nuevos}</span>
                    </div>
                    <div className="flex gap-1 items-center">
                      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${sem.finalizados >= sem.nuevos ? 'bg-emerald-400' : 'bg-amber-400'}`}
                          style={{ width: `${Math.max((sem.finalizados / maxSemana) * 100, sem.finalizados > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 tabular-nums w-4 text-right">{sem.finalizados}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold tabular-nums w-10 text-right ${sem.ratio >= 100 ? 'text-emerald-600' : sem.ratio >= 85 ? 'text-amber-600' : 'text-red-500'}`}>
                    {sem.nuevos > 0 ? `${sem.ratio}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

// ─── OEE-1 · Índice de Rendimiento del Técnico (IRT) ─────────────────────────

function FactorBar({ label, value, verificado, color }: { label: string; value: number; verificado: boolean; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-500 font-medium">{label}</span>
        <span className={`text-[10px] font-bold tabular-nums ${verificado ? 'text-slate-700' : 'text-slate-400 italic'}`}>
          {verificado ? `${value}%` : '—'}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: verificado ? `${Math.max(value, 3)}%` : '0%' }}
        />
      </div>
    </div>
  )
}

function TarjetaIrt({ t }: { t: IrtTecnico }) {
  const col = SEMAFORO_COLORES[t.semaforo]
  const nombre = `${t.nombre} ${t.apellido}`.trim()
  return (
    <div className={`rounded-2xl border-2 p-4 space-y-3 ${col.bg} ${col.border}`}>
      {/* Header: nombre + IRT */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-700 truncate">{nombre}</span>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-2xl font-bold tabular-nums leading-none ${col.text}`}>{t.irt}%</div>
          <div className="mt-0.5"><SemaforoIcon s={t.semaforo} /></div>
        </div>
      </div>

      {/* Tres factores */}
      <div className="space-y-2 pt-1 border-t border-white/60">
        <FactorBar label="Disponibilidad" value={t.disponibilidad} verificado={true} color="bg-blue-400" />
        <FactorBar label="Eficiencia" value={t.eficiencia} verificado={t.eficienciaVerificada} color="bg-violet-400" />
        <FactorBar label="Calidad (FPY)" value={t.calidad} verificado={t.calidadVerificada} color="bg-emerald-400" />
      </div>

      {/* Pie: volumen de datos */}
      <div className="flex gap-3 text-[9px] text-slate-400 pt-1 border-t border-white/40">
        <span>{t.totalAsignaciones} asig.</span>
        <span>{t.totalTrabajos} trabajos</span>
        <span>{t.totalConformidades} conf.</span>
      </div>
    </div>
  )
}

function OeeMetrica({ data }: { data: OeeData }) {
  const col = SEMAFORO_COLORES[data.semaforoGlobal]

  return (
    <div className="space-y-5">

      <ExplicacionMetrica
        numero="09"
        titulo="OEE-1 · Índice de Rendimiento del Técnico (IRT) — OEE Aplicado a Personas"
        resumen="¿Cómo rinde cada técnico en general? Un puntaje único que combina tres cosas: qué tan seguido responde cuando lo llaman, qué tan rápido termina los trabajos, y qué tan bien los hace."
        proceso="Gestión del capital humano técnico con un único índice compuesto y comparable entre técnicos. Transpone el marco OEE (Overall Equipment Effectiveness) del material LEAN (U3) al rol del técnico como 'equipo' central del proceso."
        porque="La ventaja sobre métricas individuales es que el IRT captura la imagen completa. Dos técnicos con el mismo ISC pueden tener IRT muy distintos si uno responde tarde o trabaja lento. El producto de los tres factores revela dónde está la pérdida real: un IRT de 60% con Disponibilidad 95% señala que el problema es técnico (Eficiencia o Calidad), no de compromiso."
        accion="🔴 IRT < 55% → desagregar los 3 factores para identificar la causa raíz. Disponibilidad baja → política de respuesta y gestión de carga. Eficiencia baja → capacitación técnica o mejores herramientas. Calidad baja → supervisión o mentoría en los trabajos con más rechazos."
        formula="IRT = Disponibilidad × Eficiencia × Calidad · D = respondidas/total asignaciones · E = trabajos ≤ avg categoría/total trabajos · C = conf. sin rechazo/total conf. · Verde >75% | Amarillo 55–75% | Rojo <55%"
      />

      {/* Promedio global + Explicación del modelo */}
      <div className="grid sm:grid-cols-3 gap-4">

        <div className={`rounded-2xl border-2 p-5 flex flex-col justify-between col-span-1 ${col.bg} ${col.border}`}>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">IRT Promedio del Equipo</p>
            <div className={`text-5xl font-bold tabular-nums ${col.text}`}>
              {data.promedioIrt !== null ? `${data.promedioIrt}%` : '—'}
            </div>
            <p className="text-xs text-slate-400 mt-1">{data.porTecnico.length} técnico{data.porTecnico.length !== 1 ? 's' : ''} evaluado{data.porTecnico.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="mt-4 space-y-1.5">
            <SemaforoBadge
              s={data.semaforoGlobal}
              texto={
                data.semaforoGlobal === 'verde'    ? 'Equipo eficiente' :
                data.semaforoGlobal === 'amarillo' ? 'Mejora posible'   :
                data.semaforoGlobal === 'rojo'     ? 'Acción requerida' :
                'Sin datos'
              }
            />
            <div className="flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{'>75%'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />55–75%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{'<55%'}</span>
            </div>
          </div>
        </div>

        {/* Leyenda de factores */}
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Los 3 factores del IRT</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { color: 'bg-blue-100 border-blue-200', dot: 'bg-blue-400', label: 'Disponibilidad', desc: 'Respondidas / total asignaciones recibidas', icono: '📶' },
              { color: 'bg-violet-100 border-violet-200', dot: 'bg-violet-400', label: 'Eficiencia', desc: 'Trabajos completados ≤ promedio de su categoría', icono: '⚡' },
              { color: 'bg-emerald-100 border-emerald-200', dot: 'bg-emerald-400', label: 'Calidad (FPY)', desc: 'Conformidades aprobadas sin rechazo', icono: '✅' },
            ].map(f => (
              <div key={f.label} className={`rounded-xl border p-3 space-y-1.5 ${f.color}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{f.icono}</span>
                  <p className="text-xs font-semibold text-slate-700">{f.label}</p>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 italic">
            El IRT es el producto de los tres factores. Un técnico con D=95% E=85% C=90% tiene IRT=72.7% — la paradoja del OEE: ningún factor individual parece grave, pero el producto revela la pérdida real.
          </p>
        </div>

      </div>

      {/* Ranking de técnicos */}
      {data.porTecnico.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-400">Sin datos de técnicos suficientes</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5" />
            Ranking IRT por Técnico — ordenado de mayor a menor
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.porTecnico.map(t => (
              <TarjetaIrt key={t.id_tecnico} t={t} />
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-3 italic">
            Los factores marcados con "—" indican que no hay suficientes datos para calcularlos — se usa 100% como valor neutral. A medida que el sistema acumule datos, el IRT se vuelve más preciso.
          </p>
        </div>
      )}

    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

type SubTab = 'tiempo' | 'calidad' | 'proceso' | 'finanzas' | 'tecnicos'

const SUB_TABS: { valor: SubTab; label: string; desc: string }[] = [
  { valor: 'tiempo',   label: 'Tiempo',   desc: '¿Cuánto tarda?' },
  { valor: 'calidad',  label: 'Calidad',  desc: '¿Qué tan bien?' },
  { valor: 'proceso',  label: 'Proceso',  desc: '¿Cómo fluye?' },
  { valor: 'finanzas', label: 'Finanzas', desc: '¿Cobros y pagos?' },
  { valor: 'tecnicos', label: 'Técnicos', desc: '¿Cómo rinden?' },
]

export function PpisContent({ ppis }: { ppis: TodosPpisData }) {
  const [subTab, setSubTab] = useState<SubTab>('tiempo')

  const estadosPorTab: Record<SubTab, { label: string; semaforo: Semaforo }[]> = {
    tiempo:   [{ label: 'TCI', semaforo: ppis.tci.semaforoGlobal }, { label: 'Takt Time', semaforo: ppis.cb2.semaforoRatio }],
    calidad:  [{ label: 'FPY', semaforo: ppis.fpy.semaforoGlobal }, { label: 'TCR', semaforo: ppis.tcr.semaforoGlobal }, { label: 'ISC', semaforo: ppis.isc.semaforoGlobal }],
    proceso:  [{ label: 'Reasignación', semaforo: ppis.reasignacion.semaforoGlobal }],
    finanzas: [{ label: 'Cobros (DPC)', semaforo: ppis.sp8.dpcSemaforo }, { label: 'Pagos (DPT)', semaforo: ppis.sp8.dptSemaforo }],
    tecnicos: [{ label: 'IRT del equipo', semaforo: ppis.oee.semaforoGlobal }],
  }

  return (
    <div className="space-y-5">

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {SUB_TABS.map(tab => (
          <button
            key={tab.valor}
            onClick={() => setSubTab(tab.valor)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap min-w-[80px] ${
              subTab === tab.valor
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`}
          >
            <span className="block">{tab.label}</span>
            <span className={`block text-[9px] font-normal mt-0.5 ${subTab === tab.valor ? 'text-slate-400' : 'text-slate-400'}`}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Strip de estado rápido */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Estado:</span>
        {estadosPorTab[subTab].map(item => {
          const col = SEMAFORO_COLORES[item.semaforo]
          return (
            <div key={item.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${col.bg} ${col.border}`}>
              <SemaforoIcon s={item.semaforo} />
              <span className={col.text}>{item.label}</span>
            </div>
          )
        })}
      </div>

      {/* Contenido por tab */}
      {subTab === 'tiempo' && (
        <div className="space-y-8">
          <TciMetrica data={ppis.tci} />
          <div className="border-t border-slate-100 pt-2" />
          <Cb2Metrica data={ppis.cb2} />
        </div>
      )}

      {subTab === 'calidad' && (
        <div className="space-y-8">
          <FpyMetrica data={ppis.fpy} />
          <div className="border-t border-slate-100 pt-2" />
          <TcrMetrica data={ppis.tcr} />
          <div className="border-t border-slate-100 pt-2" />
          <IscMetrica data={ppis.isc} />
        </div>
      )}

      {subTab === 'proceso' && (
        <div className="space-y-8">
          <WipMetrica data={ppis.wip} />
          <div className="border-t border-slate-100 pt-2" />
          <ReasignacionMetrica data={ppis.reasignacion} />
        </div>
      )}

      {subTab === 'finanzas' && (
        <div className="space-y-8">
          <Sp8Metrica data={ppis.sp8} />
        </div>
      )}

      {subTab === 'tecnicos' && (
        <div className="space-y-8">
          <OeeMetrica data={ppis.oee} />
        </div>
      )}

    </div>
  )
}

// ─── FPY-0 · First-Pass Yield Global ─────────────────────────────────────────

function TarjetaFpyEtapa({ etapa, multiplicador }: { etapa: FpyEtapa; multiplicador: number }) {
  const col = SEMAFORO_COLORES[etapa.semaforo]
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${col.bg} ${col.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{etapa.codigo}</span>
          <p className="text-sm font-semibold text-slate-700">{etapa.nombre}</p>
        </div>
        <SemaforoIcon s={etapa.semaforo} />
      </div>
      <div className={`text-4xl font-bold tabular-nums ${col.text}`}>{etapa.fpy}%</div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{etapa.descripcion}</p>
      <div className="pt-2 border-t border-white/60">
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{etapa.pasosSinRetrabajo} sin retrabajo</span>
          <span>{etapa.totalPasos} total</span>
        </div>
        <div className="mt-1 w-full bg-white/60 rounded-full h-1.5">
          <div
            className={`h-full rounded-full ${col.barra}`}
            style={{ width: `${etapa.fpy}%` }}
          />
        </div>
      </div>
      {multiplicador < 1 && (
        <p className="text-[10px] text-slate-400 italic">
          Contribuye ×{multiplicador.toFixed(2)} al FPY global
        </p>
      )}
    </div>
  )
}

function FpyMetrica({ data }: { data: FpyData }) {
  const colGlobal = SEMAFORO_COLORES[data.semaforoGlobal]

  // Cálculo del FPY teórico multiplicativo para mostrar la paradoja
  const fpyMultiplicativo = data.porEtapa.length > 0
    ? Math.round(data.porEtapa.reduce((acc, e) => acc * (e.fpy / 100), 1) * 100)
    : null

  const maxFpy = Math.max(...(data.tendenciaMensual.map(m => m.fpy)), 1)

  return (
    <div className="space-y-5">

      {/* Explicación */}
      <ExplicacionMetrica
        numero="02"
        titulo="FPY-0 · First-Pass Yield Global del Proceso"
        resumen="¿Cuántos incidentes pasaron por todo el proceso sin necesidad de corregir algo? Mide el porcentaje que salió bien a la primera, en cada etapa y en el total. 100% sería perfecto."
        proceso="Eficiencia integral del ciclo E2E: mide qué porcentaje de incidentes completan todas las etapas del proceso (asignación, presupuesto, conformidad) sin ningún retrabajo. Es el indicador de calidad más completo del sistema."
        porque="La paradoja del FPY: aunque cada etapa individualmente parezca razonable (ej. 85%), el FPY global es el producto de todas. Con 3 etapas al 85% el resultado es 0,85³ ≈ 61%. Sin este indicador, los problemas de calidad quedan ocultos en los promedios por etapa."
        accion="🔴 Rojo → desagregar por etapa para identificar cuál arrastra el global. Cada etapa tiene su causa raíz y su plan de acción específico. La etapa con menor FPY es el cuello de calidad del sistema."
        formula="FPY Global = (Incidentes finalizados sin retrabajo en ninguna etapa / Total finalizados) × 100 · Fuente: asignaciones_tecnico, presupuestos, conformidades"
      />

      {/* KPI Global + Paradoja */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className={`rounded-2xl border-2 p-6 flex flex-col justify-between ${colGlobal.bg} ${colGlobal.border}`}>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">FPY Global</p>
            <div className={`text-5xl font-bold tabular-nums ${colGlobal.text}`}>
              {data.fpyGlobal !== null ? `${data.fpyGlobal}%` : '—'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {data.totalSinRetrabajo} de {data.totalFinalizados} incidentes sin retrabajo
            </p>
          </div>
          <div className="mt-4 space-y-1">
            <SemaforoBadge
              s={data.semaforoGlobal}
              texto={
                data.semaforoGlobal === 'verde'    ? 'Proceso bien calibrado' :
                data.semaforoGlobal === 'amarillo' ? 'Revisar etapas críticas' :
                data.semaforoGlobal === 'rojo'     ? 'Alto desperdicio sistémico' :
                'Sin datos'
              }
            />
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{'Verde: >60%'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{'Amarillo: >40%'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{'Rojo: <40%'}</span>
            </div>
          </div>
        </div>

        {/* Paradoja del FPY */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">La Paradoja del FPY</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Si cada etapa tiene un FPY individual, el global es el <strong>producto multiplicativo</strong> de todas. Aunque cada etapa parezca "aceptable", el resultado combinado puede ser sorprendentemente bajo.
          </p>
          {data.porEtapa.length > 0 && (
            <div className="bg-white rounded-lg p-3 border border-slate-100 space-y-1.5">
              {data.porEtapa.map((e, i) => (
                <div key={e.codigo} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 w-4 text-right">{i === 0 ? '' : '×'}</span>
                  <span className="font-medium text-slate-600 w-24">{e.nombre}</span>
                  <span className="font-bold text-slate-800 tabular-nums">{e.fpy}%</span>
                  <span className="text-slate-300">→ {Math.round(data.porEtapa.slice(0, i + 1).reduce((a, b) => a * (b.fpy / 100), 1) * 100)}%</span>
                </div>
              ))}
              <div className="pt-1.5 border-t border-slate-100 flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-4">=</span>
                <span className="font-semibold text-slate-600 w-24">FPY Teórico</span>
                <span className={`font-bold tabular-nums ${fpyMultiplicativo !== null && fpyMultiplicativo >= 60 ? 'text-emerald-600' : fpyMultiplicativo !== null && fpyMultiplicativo >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {fpyMultiplicativo !== null ? `${fpyMultiplicativo}%` : '—'}
                </span>
              </div>
            </div>
          )}
          <p className="text-[10px] text-slate-400 italic">
            El FPY Global real puede diferir del teórico porque un mismo incidente puede tener rework en múltiples etapas.
          </p>
        </div>
      </div>

      {/* FPY por Etapa */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            <Repeat2 className="h-4 w-4 text-slate-400" />
            FPY por Etapa del Proceso
          </CardTitle>
          <p className="text-xs text-slate-400">La etapa con menor FPY es el principal generador de retrabajo (Waste #6 LEAN). Intervenir ahí maximiza el impacto en el FPY global.</p>
        </CardHeader>
        <CardContent>
          {data.porEtapa.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Sin datos suficientes</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data.porEtapa.map((etapa, i) => (
                <TarjetaFpyEtapa
                  key={etapa.codigo}
                  etapa={etapa}
                  multiplicador={data.porEtapa.slice(0, i + 1).reduce((a, b) => a * (b.fpy / 100), 1)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tendencia mensual */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            Evolución Mensual del FPY Global
          </CardTitle>
          <p className="text-xs text-slate-400">Una tendencia ascendente indica que el proceso se está depurando. Una caída sostenida requiere acción correctiva inmediata.</p>
        </CardHeader>
        <CardContent>
          {data.tendenciaMensual.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Sin datos suficientes</p>
          ) : (
            <div className="space-y-2">
              {data.tendenciaMensual.map(item => {
                const s: Semaforo = item.fpy >= 60 ? 'verde' : item.fpy >= 40 ? 'amarillo' : 'rojo'
                const col = SEMAFORO_COLORES[s]
                return (
                  <div key={item.mes} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-12 shrink-0">{item.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div
                        className={`h-full ${col.barra} rounded-full flex items-center justify-end pr-2 transition-all`}
                        style={{ width: `${Math.max(item.fpy, 8)}%` }}
                      >
                        <span className="text-[10px] font-bold text-white">{item.fpy}%</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 w-14 text-right tabular-nums">{item.totalFinalizados} inc.</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
