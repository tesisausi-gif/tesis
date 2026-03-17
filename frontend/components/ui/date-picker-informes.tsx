'use client'

import * as React from 'react'
import { format, isAfter, isBefore, startOfDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/shared/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// ── Helpers ──────────────────────────────────────────────────────────────────

function strToDate(s: string): Date | undefined {
  if (!s) return undefined
  const d = parseISO(s)
  return isNaN(d.getTime()) ? undefined : d
}

function dateToStr(d: Date | undefined): string {
  return d ? format(d, 'yyyy-MM-dd') : ''
}

// ── Selector de año + mes ────────────────────────────────────────────────────

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function MonthYearNav({
  displayMonth,
  onMonthChange,
}: {
  displayMonth: Date
  onMonthChange: (d: Date) => void
}) {
  const hoy = new Date()
  const year = displayMonth.getFullYear()
  const month = displayMonth.getMonth()

  const irAnio = (delta: number) => {
    const d = new Date(displayMonth)
    d.setFullYear(d.getFullYear() + delta)
    if (d <= hoy) onMonthChange(d)
  }

  const esMesFuturo = (m: number, y: number) =>
    y > hoy.getFullYear() || (y === hoy.getFullYear() && m > hoy.getMonth())

  return (
    <div className="flex flex-col gap-1.5 pb-2 border-b mb-2">
      {/* Año */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => irAnio(-1)}
          className="h-6 w-6 flex items-center justify-center rounded border text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-sm font-bold text-gray-800">{year}</span>
        <button type="button" onClick={() => irAnio(1)}
          disabled={year >= hoy.getFullYear()}
          className="h-6 w-6 flex items-center justify-center rounded border text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Meses */}
      <div className="grid grid-cols-4 gap-1">
        {MESES.map((nombre, i) => (
          <button key={i} type="button"
            disabled={esMesFuturo(i, year)}
            onClick={() => {
              const d = new Date(displayMonth)
              d.setMonth(i)
              onMonthChange(d)
            }}
            className={cn(
              'text-[11px] py-0.5 rounded transition-colors',
              i === month
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'hover:bg-gray-100 text-gray-600',
              esMesFuturo(i, year) && 'opacity-30 cursor-not-allowed'
            )}>
            {nombre}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Picker individual ─────────────────────────────────────────────────────────

interface SinglePickerProps {
  label: string
  value: Date | undefined
  onChange: (d: Date | undefined) => void
  disabledDates: (d: Date) => boolean
  placeholder: string
  hasError?: boolean
}

function SinglePicker({ label, value, onChange, disabledDates, placeholder, hasError }: SinglePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [displayMonth, setDisplayMonth] = React.useState<Date>(value ?? new Date())

  React.useEffect(() => { if (value) setDisplayMonth(value) }, [value])

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button"
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-md border bg-white px-2.5 text-sm shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1',
              hasError ? 'border-red-400 focus:ring-red-400' : 'border-input focus:ring-primary',
              !value && 'text-muted-foreground'
            )}>
            <span className="flex items-center gap-1.5 truncate">
              <CalendarIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="truncate text-xs">
                {value ? format(value, "d MMM yyyy", { locale: es }) : placeholder}
              </span>
            </span>
            {value && (
              <span role="button" tabIndex={0}
                onClick={e => { e.stopPropagation(); onChange(undefined) }}
                onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), onChange(undefined))}
                className="ml-1 shrink-0 rounded-full p-0.5 hover:bg-gray-200 text-gray-400">
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <MonthYearNav displayMonth={displayMonth} onMonthChange={setDisplayMonth} />
          {/* react-day-picker v9 API */}
          <DayPicker
            locale={es}
            mode="single"
            selected={value}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            onSelect={(d: Date | undefined) => { onChange(d); if (d) setOpen(false) }}
            disabled={disabledDates}
            showOutsideDays
            classNames={{
              month_caption: 'hidden',
              nav: 'hidden',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex',
              weekday: 'text-muted-foreground w-8 font-normal text-[0.7rem] text-center py-1',
              weeks: '',
              week: 'flex w-full mt-0.5',
              day: 'h-8 w-8 text-center text-xs p-0 relative',
              day_button: 'h-8 w-8 p-0 rounded-md hover:bg-accent inline-flex items-center justify-center text-xs font-normal w-full',
              selected: 'bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary',
              today: 'bg-accent text-accent-foreground font-semibold',
              outside: 'text-muted-foreground opacity-40',
              disabled: 'text-muted-foreground opacity-25 cursor-not-allowed',
              hidden: 'invisible',
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ── FilaFechasPicker — API de strings para no cambiar los tabs ────────────────

interface FilaFechasPickerProps {
  desde: string
  hasta: string
  onDesde: (s: string) => void
  onHasta: (s: string) => void
}

export function FilaFechasPicker({ desde, hasta, onDesde, onHasta }: FilaFechasPickerProps) {
  const desdeDate = strToDate(desde)
  const hastaDate = strToDate(hasta)
  const hoy = startOfDay(new Date())

  const disabledDesde = (d: Date) =>
    isAfter(d, hoy) || (hastaDate ? isAfter(startOfDay(d), hastaDate) : false)

  const disabledHasta = (d: Date) =>
    isAfter(d, hoy) || (desdeDate ? isBefore(startOfDay(d), desdeDate) : false)

  let errorMsg: string | null = null
  if (desdeDate && hastaDate && isAfter(desdeDate, hastaDate))
    errorMsg = '"Desde" debe ser anterior o igual a "Hasta"'

  const faltaFecha = !desde || !hasta

  return (
    <div className="col-span-2 space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <SinglePicker
          label="Desde *"
          value={desdeDate}
          onChange={d => onDesde(dateToStr(d))}
          disabledDates={disabledDesde}
          placeholder="Elegir fecha"
          hasError={!!errorMsg}
        />
        <SinglePicker
          label="Hasta *"
          value={hastaDate}
          onChange={d => onHasta(dateToStr(d))}
          disabledDates={disabledHasta}
          placeholder="Elegir fecha"
          hasError={!!errorMsg}
        />
      </div>
      {errorMsg && <p className="text-xs text-red-500">⚠ {errorMsg}</p>}
      {faltaFecha && !errorMsg && (
        <p className="text-xs text-amber-600">⚠ Seleccioná ambas fechas para generar el informe</p>
      )}
    </div>
  )
}
