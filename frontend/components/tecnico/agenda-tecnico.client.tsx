'use client'

import { useState, useRef } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { format, parseISO, isToday, isBefore, startOfDay, isValid } from 'date-fns'
import {
  CalendarDays, MapPin, Clock, ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CompromisoAgenda } from '@/features/disponibilidad/disponibilidad.types'

interface AgendaTecnicoProps {
  compromisos: CompromisoAgenda[]
}

function getAddress(c: CompromisoAgenda): string | null {
  const inm = c.incidentes?.inmuebles
  if (!inm) return null
  const partes = [inm.calle, inm.altura].filter(Boolean).join(' ')
  const ub = [inm.barrio, inm.localidad].filter(Boolean).join(', ')
  return ub ? `${partes}, ${ub}` : partes || null
}

function VisitaCard({ compromiso: c, past = false }: { compromiso: CompromisoAgenda; past?: boolean }) {
  const address = getAddress(c)
  return (
    <Link href="/tecnico/trabajos">
      <div className={`rounded-xl border p-3 transition-colors ${
        past
          ? 'border-slate-200 bg-slate-50/60'
          : 'border-blue-100 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-200'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1.5">

            {/* Time + category */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                {c.hora_inicio} – {c.hora_fin_estimada}
              </span>
              {c.incidentes?.categoria && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {c.incidentes.categoria}
                </span>
              )}
            </div>

            {/* Incident + description */}
            <p className="text-xs font-semibold text-slate-700 truncate">
              #{c.id_incidente} · {c.incidentes?.descripcion_problema ?? 'Sin descripción'}
            </p>

            {/* Address */}
            {address && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{address}</span>
              </div>
            )}
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
        </div>
      </div>
    </Link>
  )
}

export function AgendaTecnico({ compromisos }: AgendaTecnicoProps) {
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(undefined)
  const fechaRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const hoy = startOfDay(new Date())

  // Group by date
  const porFecha: Record<string, CompromisoAgenda[]> = {}
  for (const c of compromisos) {
    if (!porFecha[c.fecha_visita]) porFecha[c.fecha_visita] = []
    porFecha[c.fecha_visita].push(c)
  }
  const fechasOrdenadas = Object.keys(porFecha).sort()
  const futuras = fechasOrdenadas.filter(f => { try { return !isBefore(parseISO(f), hoy) } catch { return true } })
  const pasadas = fechasOrdenadas.filter(f => { try { return isBefore(parseISO(f), hoy) } catch { return false } })

  // Calendar modifiers — días con compromisos
  const diasConCompromiso = compromisos
    .map(c => { try { const d = parseISO(c.fecha_visita); return isValid(d) ? d : null } catch { return null } })
    .filter((d): d is Date => d !== null)

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return
    setDiaSeleccionado(day)
    const iso = format(day, 'yyyy-MM-dd')
    setTimeout(() => {
      fechaRefs.current.get(iso)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  // Empty state
  if (compromisos.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            Mi Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 text-center space-y-2">
          <CalendarDays className="h-10 w-10 text-slate-200 mx-auto" />
          <p className="text-sm font-medium text-slate-500">No tenés visitas programadas</p>
          <p className="text-xs text-slate-400">
            Desde{' '}
            <Link href="/tecnico/trabajos" className="text-blue-600 underline">
              Trabajos
            </Link>{' '}
            podés coordinar el horario con el cliente
          </p>
        </CardContent>
      </Card>
    )
  }

  const selectedIso = diaSeleccionado ? format(diaSeleccionado, 'yyyy-MM-dd') : null

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            Mi Agenda
          </CardTitle>
          <Badge className="bg-blue-100 text-blue-700 text-xs font-semibold">
            {compromisos.length} visita{compromisos.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-4">

        {/* ── Calendario ── */}
        <div className="flex justify-center rounded-xl border border-slate-100 bg-slate-50/50 p-3">
          <DayPicker
            locale={es}
            mode="single"
            selected={diaSeleccionado}
            onSelect={handleDayClick}
            modifiers={{ comprometido: diasConCompromiso }}
            modifiersClassNames={{ comprometido: '!bg-blue-600 !text-white !rounded-full !font-bold' }}
            components={{
              Chevron: ({ orientation }: { orientation?: string }) =>
                orientation === 'left'
                  ? <ChevronLeft className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />,
            }}
            classNames={{
              months: 'flex flex-col',
              month: 'space-y-2',
              month_caption: 'flex justify-center pt-1 relative items-center pb-1',
              caption_label: 'text-sm font-medium capitalize',
              nav: 'flex items-center gap-1',
              button_previous: 'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50',
              button_next:     'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50',
              month_grid: 'border-collapse',
              weekdays: 'flex',
              weekday: 'text-gray-400 rounded-md w-8 font-normal text-[0.65rem] text-center py-1',
              week: 'flex mt-1',
              day: 'h-8 w-8 text-center text-sm p-0 relative',
              day_button: 'h-8 w-8 p-0 font-normal rounded-full hover:bg-gray-100 transition-colors text-sm',
              selected: '!ring-2 !ring-blue-400 !ring-offset-1',
              today: '!text-blue-600 !font-bold',
              outside: 'text-gray-300 opacity-50',
              disabled: 'text-gray-300 opacity-40 cursor-not-allowed',
            }}
          />
        </div>

        <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
          días con visita programada · tocá un día para ir directo
        </p>

        {/* ── Lista: visitas futuras ── */}
        {futuras.length > 0 && (
          <div className="space-y-4">
            {futuras.map(fecha => {
              const esHoy = isToday(parseISO(fecha))
              const esSeleccionado = fecha === selectedIso
              return (
                <div
                  key={fecha}
                  ref={el => { if (el) fechaRefs.current.set(fecha, el); else fechaRefs.current.delete(fecha) }}
                  className={`rounded-xl transition-all ${esSeleccionado ? 'ring-2 ring-blue-300 ring-offset-2' : ''}`}
                >
                  {/* Date header */}
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

                  {/* Visit cards for this day */}
                  <div className="space-y-2">
                    {porFecha[fecha].map(c => (
                      <VisitaCard key={c.id_compromiso ?? `${c.id_incidente}-${c.hora_inicio}`} compromiso={c} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Visitas pasadas no cerradas (edge case) ── */}
        {pasadas.length > 0 && (
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
                    {porFecha[fecha].map(c => (
                      <VisitaCard key={c.id_compromiso ?? `${c.id_incidente}-${c.hora_inicio}`} compromiso={c} past />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
