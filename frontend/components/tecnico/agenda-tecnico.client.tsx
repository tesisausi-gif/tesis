'use client'

import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { format, parseISO, isToday, isBefore, startOfDay, isValid } from 'date-fns'
import { CalendarDays, MapPin, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IncidenteDetailModal } from '@/components/incidentes/incidente-detail-modal'
import type { FranjaAgenda } from '@/features/disponibilidad/disponibilidad.types'

const DAY_PICKER_CLASSES = {
  root: 'w-full',
  months: 'w-full',
  month: 'w-full space-y-1',
  month_caption: 'flex justify-center pt-1 relative items-center pb-1',
  caption_label: 'text-sm font-medium capitalize',
  nav: 'flex items-center gap-1',
  button_previous: 'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50',
  button_next:     'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50',
  month_grid: 'border-separate border-spacing-0',
  weekdays: '',
  weekday: 'text-gray-400 font-normal text-[0.65rem] text-center py-1',
  week: '',
  day: 'h-8 text-center text-sm p-0',
  day_button: 'w-full h-8 p-0 font-normal rounded-full hover:bg-gray-100 transition-colors text-sm',
  selected: '!ring-2 !ring-blue-400 !ring-offset-1',
  today: '!text-blue-600 !font-bold',
  outside: 'text-gray-300 opacity-50',
  disabled: 'text-gray-300 opacity-40 cursor-not-allowed',
} as const

// Inline styles fuerzan el layout responsive sin importar la especificidad CSS del contenedor
const DAY_PICKER_STYLES = {
  root:       { width: '100%' },
  months:     { width: '100%', maxWidth: 'none' },
  month:      { width: '100%' },
  month_grid: { width: '100%', tableLayout: 'fixed' as const },
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
  return (
    <button
      type="button"
      onClick={() => onClick(f.id_incidente)}
      className={`w-full text-left rounded-xl border p-3 transition-colors ${
        past
          ? 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'
          : 'border-blue-100 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full shrink-0">
              <Clock className="w-3 h-3" />
              {f.hora_inicio} – {f.hora_fin}
            </span>
            {f.incidentes?.categoria && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {f.incidentes.categoria}
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-700 truncate">
            #{f.id_incidente} · {f.incidentes?.descripcion_problema ?? 'Sin descripción'}
          </p>
          {address && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          )}
        </div>
        <CalendarDays className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
      </div>
    </button>
  )
}

function AgendaContent({ franjas, rol }: { franjas: FranjaAgenda[]; rol: 'tecnico' | 'admin' }) {
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(undefined)
  const [incidenteAbiertoId, setIncidenteAbiertoId] = useState<number | null>(null)
  const hoy = startOfDay(new Date())

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
        {/* Calendario — overflow-hidden en el contenedor para evitar scroll horizontal */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 overflow-hidden p-3">
          <DayPicker
            locale={es}
            mode="single"
            selected={diaSeleccionado}
            onSelect={handleDayClick}
            modifiers={{ conFranja: diasConFranja }}
            modifiersClassNames={{ conFranja: '!bg-blue-600 !text-white !rounded-full !font-bold' }}
            components={{
              Chevron: ({ orientation }: { orientation?: string }) =>
                orientation === 'left'
                  ? <ChevronLeft className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />,
            }}
            classNames={DAY_PICKER_CLASSES}
            styles={DAY_PICKER_STYLES}
          />
        </div>

        <p className="text-[11px] text-center text-slate-400 flex flex-wrap items-center justify-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
          <span>disponibilidad del cliente · tocá un día para filtrar</span>
        </p>

        {/* Indicador de día filtrado activo */}
        {selectedIso && (
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs font-semibold text-blue-700 capitalize">
              {isToday(parseISO(selectedIso))
                ? 'Hoy'
                : format(parseISO(selectedIso), "EEEE d 'de' MMMM", { locale: es })}
            </span>
            <button
              onClick={() => setDiaSeleccionado(undefined)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3 h-3" />
              Ver todos
            </button>
          </div>
        )}

        {/* Lista de incidentes */}
        {fechasAMostrar.length > 0 ? (
          <div className="space-y-4">
            {fechasAMostrar.map(fecha => {
              const esHoy = isToday(parseISO(fecha))
              return (
                <div key={fecha}>
                  {!selectedIso && (
                    <div className="flex items-center gap-2 mb-2 px-0.5">
                      <span className={`text-xs font-semibold capitalize ${esHoy ? 'text-blue-700' : 'text-slate-600'}`}>
                        {format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es })}
                      </span>
                      {esHoy && (
                        <span className="text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
                          HOY
                        </span>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
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
          <p className="text-center text-sm text-slate-400 py-4">Sin incidentes para este día</p>
        ) : null}

        {/* Pasadas — solo sin filtro activo */}
        {!selectedIso && pasadas.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-3">
              Anteriores sin cerrar
            </p>
            <div className="space-y-4 opacity-60">
              {pasadas.map(fecha => (
                <div key={fecha}>
                  <p className="text-xs text-slate-500 capitalize mb-2">
                    {format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                  <div className="space-y-2">
                    {porFecha[fecha].map(f => (
                      <FranjaCard key={f.id_franja} franja={f} past onClick={setIncidenteAbiertoId} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
