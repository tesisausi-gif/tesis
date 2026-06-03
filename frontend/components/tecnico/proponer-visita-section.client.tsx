'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, RefreshCw, Wrench, X } from 'lucide-react'
import { CalendarioDisponibilidad } from '@/components/ui/calendario-disponibilidad'
import { proponerVisita, completarVisita } from '@/features/visitas/visitas.service'
import type { VisitaResumen } from '@/features/visitas/visitas.types'
import type { FranjaInput } from '@/components/ui/calendario-disponibilidad'

interface Props {
  idIncidente:  number
  idTecnico:    number
  franjas:      FranjaInput[]
  initialVisita: VisitaResumen | null
  onCambio: () => void
  onIrAInspeccion?: () => void
}

const TIPO_LABELS = {
  inspeccion:  'Inspección inicial',
  reparacion:  'Reparación',
  seguimiento: 'Visita de seguimiento',
} as const

type SeleccionPendiente = { fecha: string; horaInicio: string; horaFin: string }

export function PropVisitaSection({
  idIncidente,
  idTecnico,
  franjas,
  initialVisita,
  onCambio,
  onIrAInspeccion,
}: Props) {
  const [visita, setVisita]               = useState<VisitaResumen | null>(initialVisita)
  const [tipo, setTipo]                   = useState<'inspeccion' | 'reparacion' | 'seguimiento'>('inspeccion')
  const [loading, setLoading]             = useState(false)
  const [postCompletar, setPostCompletar] = useState(false)
  const [pendiente, setPendiente]         = useState<SeleccionPendiente | null>(null)

  const confirmarYProponer = async () => {
    if (!pendiente) return
    setLoading(true)
    try {
      const res = await proponerVisita({
        idIncidente,
        idTecnico,
        tipo,
        fecha:      pendiente.fecha,
        horaInicio: pendiente.horaInicio,
        horaFin:    pendiente.horaFin,
      })
      if (!res.success) { toast.error(res.error); return }

      if (res.data.fuera_de_disponibilidad) {
        toast.warning('Visita propuesta fuera del horario del cliente. Puede rechazarla.')
      } else {
        toast.success('Visita propuesta — aguardando confirmación del cliente')
      }
      setPendiente(null)
      onCambio()
    } finally {
      setLoading(false)
    }
  }

  const handleCompletar = async () => {
    if (!visita) return
    setLoading(true)
    try {
      const res = await completarVisita(visita.id_visita)
      if (!res.success) { toast.error(res.error); return }
      toast.success('Visita marcada como completada')
      setVisita(null)
      setPostCompletar(true)
      onCambio()
    } finally {
      setLoading(false)
    }
  }

  const handleAgendarOtra = () => {
    setVisita(null)
    setPostCompletar(false)
  }

  // ── Post-completar ───────────────────────────────────────────────────────────
  if (postCompletar) {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3 mb-4">
        <p className="text-sm font-semibold text-teal-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Visita completada
        </p>
        <p className="text-xs text-teal-700">¿Qué querés hacer ahora?</p>
        <div className="flex gap-2 flex-wrap">
          {onIrAInspeccion && (
            <button
              onClick={onIrAInspeccion}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              <Wrench className="h-3.5 w-3.5" />
              Subir inspección ahora
            </button>
          )}
          <button
            onClick={handleAgendarOtra}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-teal-300 bg-white text-teal-700 text-xs font-semibold hover:bg-teal-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Agendar otra visita
          </button>
        </div>
      </div>
    )
  }

  // ── Visita confirmada ────────────────────────────────────────────────────────
  if (visita?.estado === 'confirmada') {
    const fechaLeg = new Date(visita.fecha_visita + 'T00:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3 mb-4">
        <p className="text-sm font-semibold text-teal-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Visita confirmada por el cliente
        </p>
        <p className="text-xs text-teal-700 capitalize">
          {fechaLeg} — {visita.hora_inicio}
          {visita.hora_fin_estimada ? ` a ${visita.hora_fin_estimada}` : ''}
        </p>
        {visita.notas_tecnico && (
          <p className="text-xs text-slate-500 italic">{visita.notas_tecnico}</p>
        )}
        <button
          disabled={loading}
          onClick={handleCompletar}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {loading ? 'Guardando...' : 'Marcar visita como completada'}
        </button>
      </div>
    )
  }

  // ── Visita propuesta — esperando confirmación ────────────────────────────────
  if (visita?.estado === 'propuesta') {
    const fechaLeg = new Date(visita.fecha_visita + 'T00:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    return (
      <div className={`rounded-xl border p-4 space-y-2 mb-4 ${
        visita.fuera_de_disponibilidad
          ? 'border-amber-200 bg-amber-50'
          : 'border-violet-200 bg-violet-50'
      }`}>
        <p className={`text-sm font-semibold flex items-center gap-2 ${
          visita.fuera_de_disponibilidad ? 'text-amber-800' : 'text-violet-800'
        }`}>
          <Clock className="h-4 w-4" />
          Visita propuesta — esperando confirmación
        </p>
        <p className={`text-xs capitalize ${
          visita.fuera_de_disponibilidad ? 'text-amber-700' : 'text-violet-700'
        }`}>
          {fechaLeg} — {visita.hora_inicio}
          {visita.hora_fin_estimada ? ` a ${visita.hora_fin_estimada}` : ''}
          {' '}· {TIPO_LABELS[visita.tipo]}
        </p>
        {visita.fuera_de_disponibilidad && (
          <p className="text-[11px] text-amber-600 italic">
            Este horario está fuera de la disponibilidad declarada por el cliente. Puede rechazarlo.
          </p>
        )}
      </div>
    )
  }

  // ── Alerta de confirmación (acción irreversible) ─────────────────────────────
  if (pendiente) {
    const fechaLeg = new Date(pendiente.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    return (
      <div className="rounded-xl border-2 border-orange-400 bg-orange-50 p-4 space-y-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-orange-800">Acción irreversible</p>
            <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
              Estás por comprometerte a visitar al cliente el{' '}
              <strong className="capitalize">{fechaLeg}</strong> de{' '}
              <strong>{pendiente.horaInicio}</strong> a <strong>{pendiente.horaFin}</strong>.
            </p>
          </div>
        </div>

        <div className="bg-orange-100 rounded-lg px-3 py-2.5 text-[11px] text-orange-800 leading-relaxed">
          Una vez confirmado, <strong>no podrás modificar</strong> la fecha ni la hora.
          Si necesitás cancelar, deberás <strong>darte de baja del incidente</strong> desde la tarjeta del trabajo.
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPendiente(null)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-orange-300 bg-white text-orange-700 text-xs font-semibold hover:bg-orange-50 disabled:opacity-50 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
          <button
            onClick={confirmarYProponer}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {loading ? 'Enviando...' : 'Sí, confirmar fecha'}
          </button>
        </div>
      </div>
    )
  }

  // ── Sin visita — mostrar selector ────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 space-y-3 mb-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-cyan-600" />
        <p className="text-sm font-semibold text-cyan-800">Proponer visita al cliente</p>
      </div>
      <p className="text-xs text-cyan-700">
        Seleccioná un día disponible del cliente y el horario al que vas a ir. El cliente recibirá
        una notificación para confirmar.
      </p>

      {/* Selector de tipo de visita */}
      <div className="flex gap-2 flex-wrap">
        {(['inspeccion', 'reparacion', 'seguimiento'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              tipo === t
                ? 'bg-cyan-700 text-white'
                : 'bg-white border border-cyan-200 text-cyan-700 hover:bg-cyan-100'
            }`}
          >
            {TIPO_LABELS[t]}
          </button>
        ))}
      </div>

      <CalendarioDisponibilidad
        modo="comprometer"
        franjas={franjas}
        onComprometer={loading ? undefined : (data) => setPendiente(data)}
      />
    </div>
  )
}
