'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarDays, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { confirmarVisita, rechazarVisita } from '@/features/visitas/visitas.service'
import type { VisitaResumen } from '@/features/visitas/visitas.types'

interface Props {
  visita:    VisitaResumen
  onCambio:  () => void
}

export function ConfirmarVisitaPanel({ visita, onCambio }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirmado, setConfirmado] = useState(visita.estado === 'confirmada')

  if (visita.estado === 'completada' || visita.estado === 'cancelada' || visita.estado === 'rechazada') {
    return null
  }

  const fechaLeg = new Date(visita.fecha_visita + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const handleConfirmar = async () => {
    setLoading(true)
    try {
      const res = await confirmarVisita(visita.id_visita)
      if (!res.success) { toast.error(res.error); return }
      toast.success('Visita confirmada. Te notificaremos el día anterior.')
      setConfirmado(true)
      onCambio()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleRechazar = async () => {
    setLoading(true)
    try {
      const res = await rechazarVisita(visita.id_visita, 'Horario fuera de disponibilidad declarada')
      if (!res.success) { toast.error(res.error); return }
      toast.info('Propuesta rechazada. El administrador buscará otro técnico.')
      onCambio()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  // ── Ya confirmada ────────────────────────────────────────────────────────────
  if (confirmado || visita.estado === 'confirmada') {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 space-y-1">
        <p className="text-sm font-semibold text-teal-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Visita confirmada
        </p>
        <p className="text-xs text-teal-700 capitalize">
          {fechaLeg} — {visita.hora_inicio}
          {visita.hora_fin_estimada ? ` a ${visita.hora_fin_estimada}` : ''}
        </p>
        {visita.notas_tecnico && (
          <p className="text-xs text-slate-500 italic">{visita.notas_tecnico}</p>
        )}
      </div>
    )
  }

  // ── Propuesta fuera de disponibilidad — mostrar advertencia ──────────────────
  if (visita.fuera_de_disponibilidad) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              El técnico propuso un horario fuera de tu disponibilidad
            </p>
            <p className="text-xs text-amber-700 mt-0.5 capitalize">
              {fechaLeg} — {visita.hora_inicio}
              {visita.hora_fin_estimada ? ` a ${visita.hora_fin_estimada}` : ''}
            </p>
          </div>
        </div>
        {visita.notas_tecnico && (
          <p className="text-xs text-slate-600 italic bg-white/60 px-2 py-1 rounded">
            Nota del técnico: {visita.notas_tecnico}
          </p>
        )}
        <p className="text-xs text-amber-700">
          Podés confirmar igual si te viene bien, o rechazar para que el administrador asigne otro técnico.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            disabled={loading}
            onClick={handleConfirmar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {loading ? 'Guardando...' : 'Confirmar igual'}
          </button>
          <button
            disabled={loading}
            onClick={handleRechazar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 bg-white text-amber-800 text-xs font-semibold hover:bg-amber-50 disabled:opacity-50 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            {loading ? 'Guardando...' : 'Rechazar propuesta'}
          </button>
        </div>
      </div>
    )
  }

  // ── Propuesta dentro de disponibilidad — confirmar o rechazar ───────────────
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <CalendarDays className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-violet-800">
            Tu técnico propuso una visita
          </p>
          <p className="text-xs text-violet-700 mt-0.5 capitalize">
            {fechaLeg} — {visita.hora_inicio}
            {visita.hora_fin_estimada ? ` a ${visita.hora_fin_estimada}` : ''}
          </p>
        </div>
      </div>
      {visita.notas_tecnico && (
        <p className="text-xs text-slate-600 italic bg-white/60 px-2 py-1 rounded">
          Nota: {visita.notas_tecnico}
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          disabled={loading}
          onClick={handleConfirmar}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {loading ? 'Guardando...' : 'Confirmar visita'}
        </button>
        <button
          disabled={loading}
          onClick={handleRechazar}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-300 bg-white text-violet-800 text-xs font-semibold hover:bg-violet-50 disabled:opacity-50 transition-colors"
        >
          <XCircle className="h-3.5 w-3.5" />
          {loading ? 'Guardando...' : 'No puedo ese día'}
        </button>
      </div>
    </div>
  )
}
