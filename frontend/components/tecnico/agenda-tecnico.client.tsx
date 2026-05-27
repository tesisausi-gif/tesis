'use client'

import { useState, useRef } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { format, parseISO, isToday, isBefore, startOfDay, isValid, addMonths, subMonths } from 'date-fns'
import { CalendarDays, MapPin, Clock, X, Zap, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import type { FranjaAgenda } from '@/features/disponibilidad/disponibilidad.types'

const DAY_PICKER_CLASSES = {
  root: 'w-full',
  months: 'w-full',
  month: 'w-full space-y-0.5',
  month_caption: 'flex justify-center pt-1 relative items-center pb-2',
  caption_label: 'text-xs font-bold uppercase tracking-widest text-slate-500 capitalize',
  nav: 'hidden',
  button_previous: 'hidden',
  button_next: 'hidden',
  month_grid: 'w-full border-separate border-spacing-0',
  weekdays: '',
  weekday: 'text-slate-400 font-semibold text-[0.6rem] text-center py-1 uppercase tracking-widest',
  week: '',
  day: 'h-8 text-center text-sm p-0',
  day_button: 'w-full h-8 p-0 font-normal rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors text-sm',
  selected: '!ring-2 !ring-blue-500 !ring-offset-1',
  today: '!text-blue-600 !font-bold',
  outside: 'text-slate-200 opacity-30',
  disabled: 'text-slate-200 opacity-25 cursor-not-allowed',
} as const

const PRIORIDAD_COLORS: Record<string, string> = {
  Urgente: 'bg-red-100 text-red-700',
  Alta:    'bg-orange-100 text-orange-700',
  Media:   'bg-amber-100 text-amber-700',
  Baja:    'bg-green-100 text-green-700',
}

interface AgendaTecnicoProps {
  franjas: FranjaAgenda[]
  embedded?: boolean
  rol?: 'tecnico' | 'admin'
}

function getAddress(f: FranjaAgenda): string | null {
  const inm = f.incidentes?.inmuebles
  if (!inm) return null
  const partes = [inm.calle, inm.altura].filter(Boolean).join(' ')
  const ub = [inm.barrio, inm.localidad].filter(Boolean).join(', ')
  return ub ? `${partes}, ${ub}` : partes || null
}

function formatHora(h: string) {
  return h.slice(0, 5)
}

function FranjaCard({
  franja: f,
  past = false,
  onClick,
}: {
  franja: FranjaAgenda
  past?: boolean
  onClick: (idIncidente: number) => void
}) {
  const address = getAddress(f)
  const categoria = f.incidentes?.categoria

  return (
    <button
      type="button"
      onClick={() => onClick(f.id_incidente)}
      className="w-full text-left active:scale-[0.98] transition-transform"
    >
      <div className={`flex rounded-2xl overflow-hidden shadow-sm border ${
        past ? 'border-slate-200' : 'border-blue-100 active:border-blue-200'
      }`}>
        {/* Franja de tiempo izquierda */}
        <div className={`flex flex-col items-center justify-center px-3 py-4 shrink-0 w-[62px] ${
          past ? 'bg-slate-100' : 'bg-blue-600'
        }`}>
          <span className={`text-base font-bold tabular-nums leading-none ${
            past ? 'text-slate-500' : 'text-white'
          }`}>
            {formatHora(f.hora_inicio)}
          </span>
          <div className={`w-px h-3 my-1 ${past ? 'bg-slate-300' : 'bg-blue-400'}`} />
          <span className={`text-[11px] tabular-nums leading-none ${
            past ? 'text-slate-400' : 'text-blue-200'
          }`}>
            {formatHora(f.hora_fin)}
          </span>
        </div>

        {/* Contenido derecho */}
        <div className={`flex-1 min-w-0 px-3 py-3 ${past ? 'bg-slate-50' : 'bg-white'}`}>
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              past ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-600'
            }`}>
              #{f.id_incidente}
            </span>
            {categoria && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                past ? 'bg-slate-200 text-slate-500' : 'bg-amber-50 text-amber-700'
              }`}>
                {categoria}
              </span>
            )}
          </div>

          <p className={`text-[13px] font-semibold leading-snug line-clamp-2 ${
            past ? 'text-slate-500' : 'text-slate-800'
          }`}>
            {f.incidentes?.descripcion_problema ?? 'Sin descripción'}
          </p>

          {address && (
            <div className={`flex items-start gap-1 mt-1.5 ${past ? 'opacity-50' : ''}`}>
              <MapPin className="w-3 h-3 shrink-0 text-slate-400 mt-0.5" />
              <span className="text-[11px] text-slate-500 leading-tight line-clamp-2">{address}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function AgendaContent({ franjas, rol }: { franjas: FranjaAgenda[]; rol: 'tecnico' | 'admin' }) {
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(undefined)
  const [incidenteAbiertoId, setIncidenteAbiertoId] = useState<number | null>(null)
  const [pasadasAbiertas, setPasadasAbiertas] = useState(false)
  const [mes, setMes] = useState<Date>(new Date())
  const touchStartX = useRef<number | null>(null)
  const hoy = startOfDay(new Date())
  const todayIso = format(hoy, 'yyyy-MM-dd')

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) {
      setMes(prev => dx < 0 ? addMonths(prev, 1) : subMonths(prev, 1))
      setDiaSeleccionado(undefined)
    }
    touchStartX.current = null
  }

  const porFecha: Record<string, FranjaAgenda[]> = {}
  for (const f of franjas) {
    if (!porFecha[f.fecha]) porFecha[f.fecha] = []
    porFecha[f.fecha].push(f)
  }
  const fechasOrdenadas = Object.keys(porFecha).sort()
  const futuras = fechasOrdenadas.filter(f => { try { return !isBefore(parseISO(f), hoy) } catch { return true } })
  const pasadas = fechasOrdenadas.filter(f => { try { return isBefore(parseISO(f), hoy) } catch { return false } })

  const diasConFranja = franjas
    .map(f => { try { const d = parseISO(f.fecha); return isValid(d) ? d : null } catch { return null } })
    .filter((d): d is Date => d !== null)

  const hayHoy = !!porFecha[todayIso]

  const selectedIso = diaSeleccionado ? format(diaSeleccionado, 'yyyy-MM-dd') : null

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return
    const iso = format(day, 'yyyy-MM-dd')
    setDiaSeleccionado(prev => prev && format(prev, 'yyyy-MM-dd') === iso ? undefined : day)
  }

  const fechasAMostrar = selectedIso
    ? (porFecha[selectedIso] ? [selectedIso] : [])
    : futuras

  return (
    <>
      <div className="space-y-4">

        {/* Banner HOY */}
        {hayHoy && !selectedIso && (
          <button
            type="button"
            onClick={() => handleDayClick(hoy)}
            className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-3.5">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-100">Hoy</p>
                <p className="text-sm font-bold text-white leading-tight">
                  {porFecha[todayIso].length} visita{porFecha[todayIso].length !== 1 ? 's' : ''} programada{porFecha[todayIso].length !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-white/60 text-xs font-medium shrink-0">Ver →</span>
            </div>
          </button>
        )}

        {/* Calendario */}
        <div
          className="rdp-agenda-wrapper rounded-2xl border border-slate-100 bg-slate-50/40 p-3 select-none"
          style={{
            '--rdp-day-width': '2rem',
            '--rdp-day-height': '2rem',
            '--rdp-day_button-width': '1.875rem',
            '--rdp-day_button-height': '1.875rem',
          } as React.CSSProperties}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <DayPicker
            locale={es}
            mode="single"
            month={mes}
            onMonthChange={setMes}
            selected={diaSeleccionado}
            onSelect={handleDayClick}
            modifiers={{ conFranja: diasConFranja }}
            modifiersClassNames={{ conFranja: '!bg-blue-600 !text-white !rounded-full !font-bold' }}
            classNames={DAY_PICKER_CLASSES}
          />
        </div>

        {/* Leyenda + filtro activo */}
        {selectedIso ? (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="capitalize">
                {isToday(parseISO(selectedIso))
                  ? 'Hoy'
                  : format(parseISO(selectedIso), "EEE d 'de' MMM", { locale: es })}
              </span>
              <button
                onClick={() => setDiaSeleccionado(undefined)}
                className="opacity-70 hover:opacity-100 active:opacity-100 transition-opacity -mr-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className="text-xs text-slate-400">
              {porFecha[selectedIso]?.length ?? 0} franja{(porFecha[selectedIso]?.length ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600 shrink-0" />
            días con disponibilidad · tocá para filtrar
          </p>
        )}

        {/* Lista de franjas */}
        {fechasAMostrar.length > 0 ? (
          <div className="space-y-5">
            {fechasAMostrar.map(fecha => {
              const esHoy = isToday(parseISO(fecha))
              return (
                <div key={fecha}>
                  {!selectedIso && (
                    <div className="flex items-center gap-2 mb-2.5 px-0.5">
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${esHoy ? 'bg-amber-500' : 'bg-blue-400'}`} />
                      <span className={`text-xs font-bold uppercase tracking-wide ${
                        esHoy ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {esHoy ? 'Hoy · ' : ''}{format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es })}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2.5">
                    {porFecha[fecha].map(f => (
                      <FranjaCard
                        key={f.id_franja}
                        franja={f}
                        onClick={setIncidenteAbiertoId}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : selectedIso ? (
          <div className="text-center py-6 space-y-1">
            <CalendarDays className="h-8 w-8 text-slate-200 mx-auto" />
            <p className="text-sm text-slate-400">Sin incidentes para este día</p>
          </div>
        ) : null}

        {/* Pasadas — colapsadas por defecto */}
        {!selectedIso && pasadas.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPasadasAbiertas(v => !v)}
              className="w-full flex items-center justify-between px-1 py-1.5 text-left"
            >
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Anteriores sin cerrar · {pasadas.reduce((acc, f) => acc + porFecha[f].length, 0)}
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${pasadasAbiertas ? 'rotate-180' : ''}`} />
            </button>

            {pasadasAbiertas && (
              <div className="space-y-5 mt-3 opacity-60">
                {pasadas.map(fecha => (
                  <div key={fecha}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2.5 px-0.5">
                      {format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <div className="space-y-2.5">
                      {porFecha[fecha].map(f => (
                        <FranjaCard key={f.id_franja} franja={f} past onClick={setIncidenteAbiertoId} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <IncidenteDetailModal
        incidenteId={incidenteAbiertoId}
        open={incidenteAbiertoId !== null}
        onOpenChange={open => { if (!open) setIncidenteAbiertoId(null) }}
        rol={rol}
      />
    </>
  )
}

export function AgendaTecnico({ franjas, embedded = false, rol = 'tecnico' }: AgendaTecnicoProps) {
  const isEmpty = franjas.length === 0
  const diasCount = Object.keys(
    franjas.reduce((acc, f) => ({ ...acc, [f.fecha]: true }), {} as Record<string, boolean>)
  ).length

  if (embedded) {
    return isEmpty ? (
      <div className="text-center space-y-2 py-4">
        <CalendarDays className="h-10 w-10 text-slate-200 mx-auto" />
        <p className="text-sm font-medium text-slate-500">Sin visitas pendientes</p>
        <p className="text-xs text-slate-400">Los incidentes asignados aparecerán acá con los horarios del cliente</p>
      </div>
    ) : (
      <AgendaContent franjas={franjas} rol={rol} />
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            Mi Agenda
          </CardTitle>
          {!isEmpty && (
            <Badge className="bg-blue-100 text-blue-700 text-xs font-semibold">
              {diasCount} día{diasCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {isEmpty ? (
          <div className="text-center space-y-2 py-2">
            <CalendarDays className="h-10 w-10 text-slate-200 mx-auto" />
            <p className="text-sm font-medium text-slate-500">No tenés visitas pendientes</p>
            <p className="text-xs text-slate-400">
              Tus incidentes asignados aparecerán acá con los horarios que eligió el cliente
            </p>
          </div>
        ) : (
          <AgendaContent franjas={franjas} rol={rol} />
        )}
      </CardContent>
    </Card>
  )
}
