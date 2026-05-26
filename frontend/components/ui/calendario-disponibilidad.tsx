'use client'

import { useState, useEffect, useCallback } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { format, parseISO, isValid } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, X, Clock, CalendarDays, CheckCircle } from 'lucide-react'
import { cn } from '@/shared/utils'

export interface FranjaInput {
  fecha: string       // 'YYYY-MM-DD'
  hora_inicio: string // 'HH:MM'
  hora_fin: string    // 'HH:MM'
}

interface CompromisoActual {
  fecha_visita: string
  hora_inicio: string
  hora_fin_estimada: string
}

interface CalendarioDisponibilidadProps {
  modo: 'editar' | 'ver' | 'comprometer'
  franjas?: FranjaInput[]
  onChange?: (franjas: FranjaInput[]) => void
  onComprometer?: (data: { fecha: string; horaInicio: string; horaFin: string }) => void
  compromisoActual?: CompromisoActual | null
  className?: string
}

const SLOTS_RAPIDOS = [
  { label: 'Mañana', inicio: '08:00', fin: '12:00' },
  { label: 'Tarde',  inicio: '12:00', fin: '18:00' },
  { label: 'Noche',  inicio: '18:00', fin: '22:00' },
  { label: 'Todo el día', inicio: '08:00', fin: '20:00' },
]

const DURACIONES = [
  { label: '30 min', minutos: 30 },
  { label: '1 hora', minutos: 60 },
  { label: '2 horas', minutos: 120 },
  { label: '3 horas', minutos: 180 },
  { label: '4 horas', minutos: 240 },
  { label: 'Medio día', minutos: 300 },
]

function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number)
  const total = h * 60 + m + minutos
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function fechaToISO(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function isoToDate(s: string): Date | undefined {
  try {
    const d = parseISO(s)
    return isValid(d) ? d : undefined
  } catch { return undefined }
}

function labelFecha(iso: string): string {
  const d = isoToDate(iso)
  if (!d) return iso
  return format(d, "EEEE d 'de' MMMM", { locale: es })
}

// ── Modo EDITAR: gestor de franjas por día ───────────────────────────────────

function SlotManagerDia({
  fecha,
  slots,
  onAdd,
  onRemove,
}: {
  fecha: string
  slots: { hora_inicio: string; hora_fin: string }[]
  onAdd: (inicio: string, fin: string) => void
  onRemove: (idx: number) => void
}) {
  const [customInicio, setCustomInicio] = useState('09:00')
  const [customFin,    setCustomFin]    = useState('12:00')
  const [showCustom,   setShowCustom]   = useState(false)

  const agregarCustom = () => {
    if (customInicio >= customFin) return
    onAdd(customInicio, customFin)
    setShowCustom(false)
  }

  return (
    <div className="border border-amber-200 rounded-xl bg-amber-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-amber-800 capitalize">{labelFecha(fecha)}</p>

      {/* Chips de slots existentes */}
      <div className="flex flex-wrap gap-1.5">
        {slots.map((s, i) => (
          <span key={i}
            className="flex items-center gap-1 bg-amber-500 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
            {s.hora_inicio}–{s.hora_fin}
            <button type="button" onClick={() => onRemove(i)} className="hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {slots.length === 0 && (
          <span className="text-xs text-amber-600 italic">Sin franjas — agregá al menos una</span>
        )}
      </div>

      {/* Quick slots */}
      <div className="flex flex-wrap gap-1">
        {SLOTS_RAPIDOS.map(s => (
          <button key={s.label} type="button"
            onClick={() => onAdd(s.inicio, s.fin)}
            className="text-[11px] px-2 py-1 rounded-full border border-amber-300 text-amber-700 hover:bg-amber-200 transition-colors">
            + {s.label}
          </button>
        ))}
        <button type="button"
          onClick={() => setShowCustom(v => !v)}
          className="text-[11px] px-2 py-1 rounded-full border border-dashed border-amber-400 text-amber-700 hover:bg-amber-200 transition-colors">
          + Personalizado
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 pt-1">
          <input type="time" value={customInicio}
            onChange={e => setCustomInicio(e.target.value)}
            className="text-xs border border-amber-300 rounded-lg px-2 py-1 bg-white w-24" />
          <span className="text-xs text-amber-700">a</span>
          <input type="time" value={customFin}
            onChange={e => setCustomFin(e.target.value)}
            className="text-xs border border-amber-300 rounded-lg px-2 py-1 bg-white w-24" />
          <button type="button" onClick={agregarCustom}
            disabled={customInicio >= customFin}
            className="text-[11px] bg-amber-500 text-white px-2 py-1 rounded-full disabled:opacity-40">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Modo VER: resumen legible de franjas ─────────────────────────────────────

function VistaFranjas({ franjas }: { franjas: FranjaInput[] }) {
  const porFecha: Record<string, { hora_inicio: string; hora_fin: string }[]> = {}
  for (const f of franjas) {
    if (!porFecha[f.fecha]) porFecha[f.fecha] = []
    porFecha[f.fecha].push({ hora_inicio: f.hora_inicio, hora_fin: f.hora_fin })
  }
  const fechasOrdenadas = Object.keys(porFecha).sort()
  if (fechasOrdenadas.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic text-center py-2">
        Sin disponibilidad horaria registrada
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      {fechasOrdenadas.map(fecha => (
        <div key={fecha} className="flex items-start gap-2 text-xs">
          <span className="font-semibold text-amber-700 capitalize min-w-0 flex-shrink-0">
            {labelFecha(fecha)}:
          </span>
          <span className="text-gray-700">
            {porFecha[fecha].map(s => `${s.hora_inicio}–${s.hora_fin}`).join(' · ')}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Modo COMPROMETER: técnico confirma su visita ─────────────────────────────

function CompromisoEditor({
  franjas,
  compromisoActual,
  onComprometer,
}: {
  franjas: FranjaInput[]
  compromisoActual?: CompromisoActual | null
  onComprometer: (data: { fecha: string; horaInicio: string; horaFin: string }) => void
}) {
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(
    compromisoActual?.fecha_visita ?? null
  )
  const [horaInicio, setHoraInicio]   = useState(compromisoActual?.hora_inicio ?? '09:00')
  const [duracionMin, setDuracionMin] = useState(60)
  const [guardando, setGuardando]     = useState(false)

  const diasDisponibles = [...new Set(franjas.map(f => f.fecha))].sort()
  const franjasDelDia = franjas.filter(f => f.fecha === diaSeleccionado)
  const horaFin = sumarMinutos(horaInicio, duracionMin)

  const confirmar = async () => {
    if (!diaSeleccionado) return
    setGuardando(true)
    try {
      await onComprometer({ fecha: diaSeleccionado, horaInicio, horaFin })
    } finally {
      setGuardando(false)
    }
  }

  // Si ya hay compromiso, mostrar como read-only con opción de reprogramar
  if (compromisoActual && !diaSeleccionado) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-blue-800">Visita programada</p>
        </div>
        <div className="text-xs text-blue-700 space-y-0.5">
          <p className="capitalize">{labelFecha(compromisoActual.fecha_visita)}</p>
          <p>{compromisoActual.hora_inicio} – {compromisoActual.hora_fin_estimada}</p>
        </div>
        <button type="button"
          onClick={() => setDiaSeleccionado(compromisoActual.fecha_visita)}
          className="text-[11px] text-blue-600 underline">
          Reprogramar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Selector de día */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">Día de la visita</p>
        <div className="flex flex-wrap gap-1.5">
          {diasDisponibles.map(d => (
            <button key={d} type="button"
              onClick={() => setDiaSeleccionado(d)}
              className={cn(
                'text-[11px] px-2.5 py-1.5 rounded-full border font-medium capitalize transition-colors',
                diaSeleccionado === d
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
              )}>
              {format(parseISO(d), 'EEE d MMM', { locale: es })}
            </button>
          ))}
        </div>
      </div>

      {diaSeleccionado && (
        <>
          {/* Franjas del día */}
          {franjasDelDia.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-[11px] font-semibold text-amber-700 mb-1">Cliente disponible:</p>
              <div className="flex flex-wrap gap-1">
                {franjasDelDia.map((f, i) => (
                  <span key={i} className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    {f.hora_inicio}–{f.hora_fin}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hora de llegada */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Hora de llegada</label>
            <input type="time" value={horaInicio}
              onChange={e => setHoraInicio(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 w-32" />
          </div>

          {/* Duración */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Duración estimada</label>
            <div className="flex flex-wrap gap-1.5">
              {DURACIONES.map(d => (
                <button key={d.minutos} type="button"
                  onClick={() => setDuracionMin(d.minutos)}
                  className={cn(
                    'text-[11px] px-2.5 py-1.5 rounded-full border font-medium transition-colors',
                    duracionMin === d.minutos
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                  )}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-3 text-xs text-gray-700">
            <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>Salida estimada: <strong>{horaFin}</strong></span>
          </div>

          {/* Confirmar */}
          <button type="button" onClick={confirmar} disabled={guardando}
            className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {guardando ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
            ) : (
              <><CheckCircle className="w-4 h-4" />Confirmar visita</>
            )}
          </button>
        </>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export function CalendarioDisponibilidad({
  modo,
  franjas = [],
  onChange,
  onComprometer,
  compromisoActual,
  className,
}: CalendarioDisponibilidadProps) {
  // Estado para modo editar
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [slotsByDate, setSlotsByDate] = useState<Record<string, { hora_inicio: string; hora_fin: string }[]>>({})

  // Inicializar con franjas existentes (modo editar)
  useEffect(() => {
    if (modo !== 'editar' || franjas.length === 0) return
    const map: Record<string, { hora_inicio: string; hora_fin: string }[]> = {}
    for (const f of franjas) {
      if (!map[f.fecha]) map[f.fecha] = []
      map[f.fecha].push({ hora_inicio: f.hora_inicio, hora_fin: f.hora_fin })
    }
    setSlotsByDate(map)
    setSelectedDates(Object.keys(map).map(k => parseISO(k)).filter(isValid))
  }, []) // solo al montar

  const emitChange = useCallback((dates: Date[], slots: typeof slotsByDate) => {
    if (!onChange) return
    const result: FranjaInput[] = []
    for (const fecha of Object.keys(slots)) {
      for (const s of slots[fecha]) {
        result.push({ fecha, hora_inicio: s.hora_inicio, hora_fin: s.hora_fin })
      }
    }
    onChange(result)
  }, [onChange])

  const handleSelectDates = (dates: Date[] | undefined) => {
    const next = dates ?? []
    setSelectedDates(next)
    // Eliminar slots de días deseleccionados
    const nextKeys = new Set(next.map(fechaToISO))
    const newSlots = Object.fromEntries(
      Object.entries(slotsByDate).filter(([k]) => nextKeys.has(k))
    )
    setSlotsByDate(newSlots)
    emitChange(next, newSlots)
  }

  const addSlot = (fecha: string, inicio: string, fin: string) => {
    const prev = slotsByDate[fecha] ?? []
    // Evitar duplicados exactos
    if (prev.some(s => s.hora_inicio === inicio && s.hora_fin === fin)) return
    const next = { ...slotsByDate, [fecha]: [...prev, { hora_inicio: inicio, hora_fin: fin }] }
    setSlotsByDate(next)
    emitChange(selectedDates, next)
  }

  const removeSlot = (fecha: string, idx: number) => {
    const prev = slotsByDate[fecha] ?? []
    const next = { ...slotsByDate, [fecha]: prev.filter((_, i) => i !== idx) }
    setSlotsByDate(next)
    emitChange(selectedDates, next)
  }

  // Días disponibles (para modos ver/comprometer)
  const diasDisponibles = [...new Set(franjas.map(f => f.fecha))]
    .map(s => isoToDate(s))
    .filter((d): d is Date => d !== undefined)

  const modifiers = {
    disponible: diasDisponibles,
  }
  const modifiersClassNames = {
    disponible: 'bg-amber-100 text-amber-800 font-semibold rounded-full',
  }

  const dayPickerCommon = {
    locale: es,
    components: {
      Chevron: ({ orientation }: { orientation?: string }) =>
        orientation === 'left'
          ? <ChevronLeft className="h-4 w-4" />
          : <ChevronRight className="h-4 w-4" />,
    },
    classNames: {
      months: 'flex flex-col w-fit mx-auto',
      month: 'space-y-2',
      month_caption: 'flex justify-center pt-1 relative items-center pb-1',
      caption_label: 'text-sm font-medium capitalize',
      nav: 'absolute inset-0 flex items-center justify-between px-1 pointer-events-none',
      button_previous: 'h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 pointer-events-auto',
      button_next: 'h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 pointer-events-auto',
      month_grid: 'border-collapse',
      weekdays: 'flex',
      weekday: 'text-gray-400 rounded-md w-8 font-normal text-[0.65rem] text-center py-1',
      week: 'flex mt-1',
      day: 'h-8 w-8 text-center text-sm p-0 relative',
      day_button: 'h-8 w-8 p-0 font-normal rounded-full hover:bg-gray-100 transition-colors text-sm',
      selected: '!bg-gray-900 !text-white rounded-full',
      today: 'text-blue-600 font-bold',
      outside: 'text-gray-300 opacity-50',
      disabled: 'text-gray-300 opacity-40 cursor-not-allowed',
    },
  }

  return (
    <div className={cn('space-y-4', className)}>

      {/* ── MODO EDITAR ── */}
      {modo === 'editar' && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex justify-center">
            <DayPicker
              {...dayPickerCommon}
              mode="multiple"
              selected={selectedDates}
              onSelect={handleSelectDates}
              disabled={{ before: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0,0,0,0); return d; })() }}
            />
          </div>
          <p className="text-[11px] text-gray-400 text-center">
            Hacé click en los días en que podés recibir al técnico
          </p>

          {selectedDates.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Horarios por día
              </p>
              {[...selectedDates]
                .sort((a, b) => a.getTime() - b.getTime())
                .map(d => {
                  const iso = fechaToISO(d)
                  return (
                    <SlotManagerDia
                      key={iso}
                      fecha={iso}
                      slots={slotsByDate[iso] ?? []}
                      onAdd={(inicio, fin) => addSlot(iso, inicio, fin)}
                      onRemove={idx => removeSlot(iso, idx)}
                    />
                  )
                })}
            </div>
          )}

          {selectedDates.length === 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
              <CalendarDays className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-600">
                Seleccioná días en el calendario y luego agregá franjas horarias
              </p>
            </div>
          )}
        </>
      )}

      {/* ── MODO VER ── */}
      {modo === 'ver' && (
        <>
          {franjas.length > 0 ? (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-3 flex justify-center overflow-hidden">
                <DayPicker
                  {...dayPickerCommon}
                  mode="single"
                  modifiers={modifiers}
                  modifiersClassNames={modifiersClassNames}
                  selected={undefined}
                  onSelect={() => {}}
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Franjas disponibles del cliente
                </p>
                <VistaFranjas franjas={franjas} />
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">El cliente no especificó disponibilidad horaria</p>
            </div>
          )}
        </>
      )}

      {/* ── MODO COMPROMETER ── */}
      {modo === 'comprometer' && (
        <>
          {franjas.length > 0 ? (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-3 flex justify-center overflow-hidden">
                <DayPicker
                  {...dayPickerCommon}
                  mode="single"
                  modifiers={modifiers}
                  modifiersClassNames={modifiersClassNames}
                  selected={undefined}
                  onSelect={() => {}}
                  footer={
                    <p className="text-[11px] text-center text-amber-600 mt-2">
                      Días marcados = disponibles del cliente
                    </p>
                  }
                />
              </div>

              {onComprometer && (
                <CompromisoEditor
                  franjas={franjas}
                  compromisoActual={compromisoActual}
                  onComprometer={onComprometer}
                />
              )}
            </>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">El cliente no especificó disponibilidad horaria</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
