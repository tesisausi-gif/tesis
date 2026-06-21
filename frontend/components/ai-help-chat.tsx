'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  ThreadPrimitive,
  ComposerPrimitive,
  useThreadRuntime,
  useThread,
  useComposer,
  useComposerRuntime,
  type ChatModelAdapter,
} from '@assistant-ui/react'
import { X, Send, ImagePlus, XCircle, ArrowRight, Camera } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { sendMessageToWalter } from '@/features/walter/walter.service'
import type { WalterMessage, WalterRol, WalterSuggestedAction, WalterChart, WalterInmuebleOption, WalterLink } from '@/features/walter/walter.types'
import { CalendarioDisponibilidad, type FranjaInput } from '@/components/ui/calendario-disponibilidad'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AIHelpChatProps {
  variant?: 'floating' | 'admin'
  rol?: WalterRol
}

interface PendingImage {
  base64: string
  mimeType: string
  preview: string
}

// ── Quick actions and welcome messages ────────────────────────────────────────

const QUICK_ACTIONS: Record<WalterRol, { label: string; message: string }[]> = {
  cliente: [
    { label: '📸 Diagnosticar problema', message: 'Quiero diagnosticar un problema en mi propiedad. ¿Cómo empezamos?' },
    { label: '❓ Ayuda con el sistema', message: '¿Cómo funciona el sistema? ¿Qué puedo hacer desde mi cuenta?' },
    { label: '📋 Consultar un incidente', message: '¿Cómo puedo ver el estado de mis incidentes?' },
  ],
  tecnico: [
    { label: '🔧 Mi flujo de trabajo', message: '¿Cuál es el flujo completo de trabajo para un incidente asignado?' },
    { label: '❓ Ayuda con el sistema', message: '¿Cómo funciona el portal técnico? ¿Qué puedo hacer desde mi cuenta?' },
    { label: '📋 Etapas de un trabajo', message: 'Explicame las etapas desde la inspección hasta el cobro.' },
  ],
  admin: [
    { label: '📊 Analizar métricas', message: '¿Qué métricas del sistema me podés ayudar a analizar?' },
    { label: '🔧 Gestión operativa', message: '¿En qué me podés asistir para la gestión del día a día?' },
    { label: '📋 Ver incidentes recientes', message: 'Mostrame los incidentes más recientes del sistema.' },
  ],
}

const WELCOME_MESSAGES: Record<WalterRol, string> = {
  cliente: '¡Hola! Soy Walter 👋\nPuedo ayudarte a diagnosticar problemas en tus propiedades, consultar el estado de tus incidentes y guiarte en el uso del sistema.',
  tecnico: '¡Hola! Soy Walter 👋\nPuedo guiarte en tu flujo de trabajo, consultar el estado de incidentes asignados y ayudarte con cualquier duda sobre el sistema.',
  admin: '¡Hola! Soy Walter 👋\nPuedo ayudarte a analizar métricas, diagnosticar incidentes, consultar estados en tiempo real y asistirte en la gestión operativa.',
}

// ── Inner chat panel (needs AssistantRuntimeProvider context) ─────────────────

interface WalterChatPanelProps {
  rol: WalterRol
  variant: 'floating' | 'admin'
  isOpen: boolean
  onClose: () => void
  pendingImage: PendingImage | null
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onImageClear: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  cameraInputRef: React.RefObject<HTMLInputElement | null>
  suggestedAction: WalterSuggestedAction | null
  onClearSuggestedAction: () => void
  chart: WalterChart | null
  onClearChart: () => void
  incidenteCreado: { id_incidente: number } | null
  onClearIncidenteCreado: () => void
  showCalendario: boolean
  calendarioFranjas: FranjaInput[]
  onCalendarioChange: (franjas: FranjaInput[]) => void
  onCalendarioConfirm: () => void
  inmueblesList: WalterInmuebleOption[] | null
  onInmuebleSelect: () => void
  links: WalterLink[] | null
  onClearLinks: () => void
  imagePreviewsRef: React.MutableRefObject<Map<string, string>>
}

// ── Paleta compartida ─────────────────────────────────────────────────────────
const CHART_COLORS = ['#1d4ed8', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function ChartHeader({ title, onClose }: { title: string; onClose?: () => void }) {
  return (
    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide truncate">{title}</p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar gráfico"
          className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors rounded-md p-0.5 hover:bg-slate-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function BarChart({ chart }: { chart: WalterChart }) {
  const max = Math.max(...chart.data.map((d) => d.value), 1)
  return (
    <div className="p-3 space-y-2">
      {chart.data.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-xs text-slate-700 truncate max-w-[75%]">{item.label}</span>
            <span className="text-xs font-bold text-slate-800 ml-2">{item.value}{chart.unit ? ` ${chart.unit}` : ''}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: chart.color ?? `linear-gradient(90deg, #1e3a5f 0%, ${CHART_COLORS[i % CHART_COLORS.length]} 100%)`,
                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function PieDonutChart({ chart }: { chart: WalterChart }) {
  const donut = chart.type === 'donut'
  const total = chart.data.reduce((s, d) => s + d.value, 0)
  const CX = 50, CY = 50, R = donut ? 28 : 38, INNER_R = 16

  function polarXY(angleDeg: number, r: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
  }

  let cursor = 0
  const slices = chart.data.map((item, i) => {
    const sweep = (item.value / total) * 360
    const start = cursor
    const end = cursor + sweep
    cursor = end

    const s = polarXY(start, R), e = polarXY(end, R)
    const largeArc = sweep > 180 ? 1 : 0

    let d: string
    if (donut) {
      const si = polarXY(start, INNER_R), ei = polarXY(end, INNER_R)
      d = `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y} L ${ei.x} ${ei.y} A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${si.x} ${si.y} Z`
    } else {
      d = `M ${CX} ${CY} L ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y} Z`
    }
    return { ...item, d, color: CHART_COLORS[i % CHART_COLORS.length], pct: Math.round((item.value / total) * 100) }
  })

  return (
    <div className="p-3 flex gap-3 items-center">
      <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0">
        {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
      </svg>
      <div className="flex-1 space-y-1.5 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-slate-700 truncate flex-1">{s.label}</span>
            <span className="text-xs font-bold text-slate-800 shrink-0">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LineChart({ chart }: { chart: WalterChart }) {
  const W = 260, H = 90
  const PAD = { t: 8, r: 8, b: 24, l: 28 }
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b
  const n = chart.data.length
  const max = Math.max(...chart.data.map((d) => d.value), 1)
  const min = Math.min(...chart.data.map((d) => d.value), 0)
  const range = max - min || 1

  const pts = chart.data.map((d, i) => ({
    x: PAD.l + (n === 1 ? iW / 2 : (i / (n - 1)) * iW),
    y: PAD.t + (1 - (d.value - min) / range) * iH,
    ...d,
  }))

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD.t + iH).toFixed(1)} L ${PAD.l} ${(PAD.t + iH).toFixed(1)} Z`

  return (
    <div className="p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id="wlg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + t * iH} y2={PAD.t + t * iH} stroke="#e2e8f0" strokeWidth="0.5" />
        ))}
        {/* Area fill */}
        <path d={areaD} fill="url(#wlg)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots + labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="2.5" fill="#1d4ed8" />
            <text x={p.x} y={H - 6} textAnchor="middle" fontSize="6.5" fill="#94a3b8">{p.label}</text>
          </g>
        ))}
        {/* Y labels */}
        <text x={PAD.l - 3} y={PAD.t + 3} textAnchor="end" fontSize="6" fill="#94a3b8">{max}</text>
        <text x={PAD.l - 3} y={PAD.t + iH + 3} textAnchor="end" fontSize="6" fill="#94a3b8">{min}</text>
      </svg>
    </div>
  )
}

function WalterChart({ chart, onClose }: { chart: WalterChart; onClose?: () => void }) {
  return (
    <div className="mx-3 my-1 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0">
      <ChartHeader title={chart.title} onClose={onClose} />
      {chart.type === 'bar' && <BarChart chart={chart} />}
      {(chart.type === 'pie' || chart.type === 'donut') && <PieDonutChart chart={chart} />}
      {chart.type === 'line' && <LineChart chart={chart} />}
    </div>
  )
}

function WalterChatPanel({
  rol,
  isOpen,
  onClose,
  pendingImage,
  onImageSelect,
  onImageClear,
  fileInputRef,
  cameraInputRef,
  suggestedAction,
  onClearSuggestedAction,
  chart,
  onClearChart,
  incidenteCreado,
  onClearIncidenteCreado,
  showCalendario,
  calendarioFranjas,
  onCalendarioChange,
  onCalendarioConfirm,
  inmueblesList,
  onInmuebleSelect,
  links,
  onClearLinks,
  imagePreviewsRef,
}: WalterChatPanelProps) {
  const threadRuntime = useThreadRuntime()
  const composerRuntime = useComposerRuntime()
  const isRunning = useThread((s) => s.isRunning)
  const isComposerEmpty = useComposer((c) => c.isEmpty)
  const hasUserMessages = useThread((s) => s.messages.some((m) => m.role === 'user'))
  const quickActions = QUICK_ACTIONS[rol]

  // Clear suggested action, chart and links when a new message starts processing
  useEffect(() => {
    if (isRunning) {
      onClearSuggestedAction()
      onClearChart()
      onClearLinks()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  const sendQuickAction = (message: string) => {
    threadRuntime.append({ role: 'user', content: [{ type: 'text', text: message }] })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed bottom-6 right-4 w-[92vw] sm:w-96 flex flex-col rounded-2xl overflow-hidden shadow-2xl z-[9999]"
      style={{ height: showCalendario ? '90vh' : '520px', border: '1px solid rgba(255,255,255,0.08)', transition: 'height 0.25s ease' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: 'linear-gradient(135deg, #0e1929 0%, #131e32 100%)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(59,130,246,0.3)' }}
          >
            <span className="text-white font-black text-sm" style={{ fontFamily: 'var(--font-syne)', letterSpacing: '-0.04em' }}>W</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none" style={{ fontFamily: 'var(--font-syne)' }}>Walter</p>
            <p className="text-blue-300/60 text-[10px] mt-0.5">
              Asistente Mantis · IA
              {isRunning && <span className="ml-1 animate-pulse">●</span>}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages viewport */}
      <ThreadPrimitive.Root className="flex-1 flex flex-col min-h-0 bg-white">
        <ThreadPrimitive.Viewport className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-4">
          {/* Welcome message shown when no messages yet */}
          <ThreadPrimitive.Empty>
            <div className="flex justify-start mb-3">
              <div className="max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-wrap text-slate-800 bg-slate-100">
                {WELCOME_MESSAGES[rol]}
              </div>
            </div>
          </ThreadPrimitive.Empty>

          {/* Message list */}
          <ThreadPrimitive.Messages>
            {({ message }) => {
              const typedMsg = message as unknown as {
                content: Array<{ type: string; text?: string }>
                status?: { type?: string; reason?: string; error?: string }
              }
              const parts = typedMsg.content ?? []
              const textContent = parts.find((p) => p.type === 'text')?.text ?? ''
              const errorText = typedMsg.status?.reason === 'error' ? (typedMsg.status.error ?? '') : ''
              const displayText = textContent || errorText

              if (message.role === 'user') {
                const imagePreview = imagePreviewsRef.current.get(message.id)
                // Strip internal tokens from displayed text
                const userDisplayText = textContent
                  .split('\nDISPONIBILIDAD_JSON:')[0]
                  .replace(/^INMUEBLE_SELECCIONADO:id=\d+:/, '')
                  .trim()
                return (
                  <div className="flex justify-end mb-3">
                    <div className="max-w-[82%] space-y-1 flex flex-col items-end">
                      {imagePreview && (
                        <img src={imagePreview} alt="adjunto" className="rounded-xl max-h-40 object-cover border border-slate-200" />
                      )}
                      {userDisplayText && (
                        <div
                          className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed whitespace-pre-wrap break-words text-white"
                          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)' }}
                        >
                          {userDisplayText}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              // Assistant message (or error state)
              return (
                <div className="flex justify-start mb-3">
                  <div className="max-w-[82%] space-y-1 flex flex-col items-start">
                    {displayText && (
                      <div className={`px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed walter-prose ${errorText && !textContent ? 'text-red-700 bg-red-50' : 'text-slate-800 bg-slate-100'}`}>
                        <ReactMarkdown>{displayText}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )
            }}
          </ThreadPrimitive.Messages>

          {/* Typing indicator */}
          {isRunning && (
            <div className="flex justify-start mb-3">
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </ThreadPrimitive.Viewport>

        {/* Chart */}
        {chart && !isRunning && <WalterChart chart={chart} onClose={onClearChart} />}

        {/* Selección de inmueble — botones uno por propiedad */}
        {inmueblesList && !isRunning && (
          <div className="bg-white border-t border-slate-100 px-3 py-2.5 shrink-0 space-y-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Seleccioná el inmueble</p>
            {inmueblesList.map((op) => (
              <button
                key={op.id}
                onClick={() => {
                  onInmuebleSelect()
                  sendQuickAction(`INMUEBLE_SELECCIONADO:id=${op.id}:${op.direccion}`)
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all active:scale-[0.98]"
              >
                {op.direccion}
              </button>
            ))}
          </div>
        )}

        {/* Links de navegación — WALTER_LINKS */}
        {links && links.length > 0 && !isRunning && (
          <div className="bg-white border-t border-slate-100 px-3 py-2.5 shrink-0 space-y-1.5">
            {links.map((link, i) => (
              <Link
                key={i}
                href={link.url}
                onClick={onClearLinks}
                className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all group"
              >
                <span className="font-medium">{link.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </Link>
            ))}
          </div>
        )}

        {/* Calendario de disponibilidad embebido */}
        {showCalendario && !isRunning && (
          <div className="bg-white border-t border-slate-100 flex flex-col overflow-hidden shrink-0" style={{ maxHeight: '55vh' }}>
            <div className="overflow-y-auto flex-1 min-h-0 px-3 pt-3 pb-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Seleccioná tu disponibilidad</p>
              <CalendarioDisponibilidad
                modo="editar"
                franjas={calendarioFranjas}
                onChange={onCalendarioChange}
                className="text-sm"
              />
            </div>
            <div className="px-3 py-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => {
                  const validas = calendarioFranjas.filter(f => f.hora_inicio && f.hora_fin)
                  if (!validas.length) return
                  onCalendarioConfirm()
                  sendQuickAction(`Disponibilidad confirmada.\nDISPONIBILIDAD_JSON:${JSON.stringify(validas)}`)
                }}
                disabled={calendarioFranjas.filter(f => f.hora_inicio && f.hora_fin).length === 0}
                className="w-full py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #0e1929 0%, #1e3a5f 100%)', color: '#93c5fd' }}
              >
                Confirmar disponibilidad
              </button>
            </div>
          </div>
        )}

        {/* Incidente creado — card de éxito */}
        {incidenteCreado && !isRunning && (
          <div className="px-3 py-2 bg-white border-t border-slate-100 shrink-0">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)' }}>
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-emerald-300 leading-tight">Incidente registrado</p>
                  <p className="text-[11px] text-emerald-200/70 mt-0.5">N.º de reporte: <span className="font-semibold text-emerald-200">#{incidenteCreado.id_incidente}</span></p>
                </div>
                <button onClick={onClearIncidenteCreado} className="text-emerald-500/50 hover:text-emerald-400 transition-colors shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <Link href="/cliente/incidentes" onClick={onClose}
                className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border-t border-emerald-500/20">
                <span className="text-[11px] font-semibold text-emerald-300">Ver mis incidentes</span>
                <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
              </Link>
            </div>
          </div>
        )}

        {/* Suggested action — dos botones: formulario + reporte guiado por chat */}
        {suggestedAction && !isRunning && (
          <div className="px-3 py-2 bg-white border-t border-slate-100 shrink-0 flex flex-col gap-2">
            {/* Botón 1: ir al formulario */}
            <Link href={suggestedAction.url} onClick={onClose} className="block">
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer hover:brightness-105 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0e1929 0%, #1e3a5f 100%)', color: '#93c5fd' }}
              >
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                Completar formulario de reporte
              </div>
            </Link>
            {/* Botón 2: reportar guiado desde el chat */}
            <button
              onClick={() => {
                onClearSuggestedAction()
                sendQuickAction('Quiero reportar este incidente directamente desde el chat.')
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer transition-all active:scale-95 border border-blue-200 text-blue-600 hover:bg-blue-50 w-full"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-3.038-.477L3 20.25l1.538-3.192A8.895 8.895 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              Reportar desde el chat
            </button>
          </div>
        )}

        {/* Quick actions (only before first user message) */}
        {!hasUserMessages && !isRunning && (
          <div className="bg-white border-t border-slate-100 shrink-0 px-3 py-2 flex flex-wrap gap-1.5">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={() => sendQuickAction(qa.message)}
                className="text-[11px] font-medium px-2.5 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all whitespace-nowrap"
              >
                {qa.label}
              </button>
            ))}
          </div>
        )}

        {/* Pending image preview */}
        {pendingImage && (
          <div className="px-3 pt-2 bg-white border-t border-slate-100 shrink-0">
            <div className="relative inline-block">
              <img src={pendingImage.preview} alt="adjunto" className="h-16 rounded-xl object-cover border border-slate-200" />
              <button
                onClick={onImageClear}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-700 text-white flex items-center justify-center"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Composer */}
        <ComposerPrimitive.Root className="px-3 py-3 bg-white border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-blue-300 transition-colors">
            <ComposerPrimitive.Input
              placeholder="Escribí tu consulta..."
              disabled={isRunning}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none py-1 resize-none min-h-[28px] max-h-[80px]"
              rows={1}
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isRunning}
              className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors shrink-0"
              title="Tomar foto"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRunning}
              className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors shrink-0"
              title="Adjuntar imagen"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isComposerEmpty) {
                  composerRuntime.send()
                } else if (pendingImage) {
                  threadRuntime.append({ role: 'user', content: [{ type: 'text', text: '' }] })
                }
              }}
              disabled={isRunning || (isComposerEmpty && !pendingImage)}
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #0e1929 0%, #1d4ed8 100%)' }}
            >
              <Send className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
          {/* capture="environment" abre la cámara trasera directamente en mobile */}
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onImageSelect} />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageSelect} />
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AIHelpChat({ variant = 'floating', rol = 'cliente' }: AIHelpChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null)
  const [suggestedAction, setSuggestedAction] = useState<WalterSuggestedAction | null>(null)
  const [chart, setChart] = useState<WalterChart | null>(null)
  const [incidenteCreado, setIncidenteCreado] = useState<{ id_incidente: number } | null>(null)
  const [showCalendario, setShowCalendario] = useState(false)
  const [calendarioFranjas, setCalendarioFranjas] = useState<FranjaInput[]>([])
  const [inmueblesList, setInmueblesList] = useState<WalterInmuebleOption[] | null>(null)
  const [links, setLinks] = useState<WalterLink[] | null>(null)

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const wasDraggedRef = useRef(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Refs for adapter closures (always hold current values)
  const pendingImageRef = useRef<PendingImage | null>(null)
  const imagePreviewsRef = useRef(new Map<string, string>())
  // Última imagen enviada — persiste en memoria para adjuntarla al crear el incidente
  const lastSentImageRef = useRef<{ base64: string; mimeType: string } | null>(null)
  const setSuggestedActionRef = useRef(setSuggestedAction)
  const setChartRef = useRef(setChart)
  const setIncidenteCreadoRef = useRef(setIncidenteCreado)
  const setShowCalendarioRef = useRef(setShowCalendario)
  const setInmueblesListRef = useRef(setInmueblesList)
  const setLinksRef = useRef(setLinks)
  const clearPendingImageRef = useRef(() => setPendingImage(null))

  useEffect(() => { pendingImageRef.current = pendingImage }, [pendingImage])
  useEffect(() => { setSuggestedActionRef.current = setSuggestedAction }, [])
  useEffect(() => { setChartRef.current = setChart }, [])
  useEffect(() => { setIncidenteCreadoRef.current = setIncidenteCreado }, [])
  useEffect(() => { setShowCalendarioRef.current = setShowCalendario }, [])
  useEffect(() => { setInmueblesListRef.current = setInmueblesList }, [])
  useEffect(() => { setLinksRef.current = setLinks }, [])
  useEffect(() => { clearPendingImageRef.current = () => setPendingImage(null) }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Keep button above bottom nav bars (64px) + safe area + margin
      setPosition({ x: window.innerWidth - 72, y: window.innerHeight - 220 })
      setMounted(true)
    }
  }, [])

  // ── Chat model adapter ──────────────────────────────────────────────────────

  const adapter = useMemo((): ChatModelAdapter => ({
    async run({ messages }) {
      try {
        const pendingImg = pendingImageRef.current

        // Get last user message for image attachment and preview storage
        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')

        // Store preview for display and last image for later incident creation
        if (pendingImg && lastUserMsg) {
          imagePreviewsRef.current.set(lastUserMsg.id, pendingImg.preview)
          lastSentImageRef.current = { base64: pendingImg.base64, mimeType: pendingImg.mimeType }
        }

        // Convert library ThreadMessage[] → WalterMessage[]
        const walterMessages: WalterMessage[] = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((msg) => {
            const parts = (msg as unknown as { content: Array<{ type: string; text?: string }> }).content
            const text = parts.find((p) => p.type === 'text')?.text ?? ''

            if (msg.role === 'user') {
              const isLast = msg === lastUserMsg
              return {
                role: 'user' as const,
                content: text,
                ...(isLast && pendingImg
                  ? { imageBase64: pendingImg.base64, imageMimeType: pendingImg.mimeType }
                  : {}),
              }
            }

            return { role: 'assistant' as const, content: text }
          })

        const result = await sendMessageToWalter(walterMessages, rol, lastSentImageRef.current ?? undefined)

        // Clear pending image regardless of outcome
        pendingImageRef.current = null
        clearPendingImageRef.current()

        if (!result.success) {
          setSuggestedActionRef.current(null)
          setChartRef.current(null)
          setIncidenteCreadoRef.current(null)
          setShowCalendarioRef.current(false)
          setInmueblesListRef.current(null)
          setLinksRef.current(null)
          return {
            content: [{ type: 'text', text: result.error ?? 'No pude procesar tu consulta. Intentá de nuevo.' }],
          }
        }

        setSuggestedActionRef.current(result.suggestedAction ?? null)
        setChartRef.current(result.chart ?? null)
        setIncidenteCreadoRef.current(result.incidenteCreado ?? null)
        setInmueblesListRef.current(result.inmueblesList ?? null)
        setLinksRef.current(result.links ?? null)
        if (result.showCalendario) {
          setShowCalendarioRef.current(true)
          setCalendarioFranjas([])
        } else if (result.incidenteCreado) {
          setShowCalendarioRef.current(false)
        }

        return {
          content: [{ type: 'text', text: result.content ?? '' }],
        }
      } catch (err) {
        pendingImageRef.current = null
        clearPendingImageRef.current()
        setSuggestedActionRef.current(null)
        setChartRef.current(null)
        setIncidenteCreadoRef.current(null)
        setShowCalendarioRef.current(false)
        setInmueblesListRef.current(null)
        setLinksRef.current(null)
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[Walter adapter]', msg)
        return {
          content: [{ type: 'text', text: `Ocurrió un error al contactar al asistente: ${msg.slice(0, 120)}` }],
        }
      }
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rol])

  const runtime = useLocalRuntime(adapter)

  // ── Drag logic ──────────────────────────────────────────────────────────────

  const handleDragStart = (clientX: number, clientY: number) => {
    wasDraggedRef.current = false
    setIsDragging(true)
    setDragStart({ x: clientX - position.x, y: clientY - position.y })
  }

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return
    const newX = Math.max(0, Math.min(clientX - dragStart.x, window.innerWidth - 48))
    const newY = Math.max(0, Math.min(clientY - dragStart.y, window.innerHeight - 48))
    if (Math.abs(newX - position.x) > 4 || Math.abs(newY - position.y) > 4) wasDraggedRef.current = true
    setPosition({ x: newX, y: newY })
  }

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => { if (e.touches[0]) handleDragMove(e.touches[0].clientX, e.touches[0].clientY) }
    const onEnd = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [isDragging, dragStart, position])

  // ── Image handling ──────────────────────────────────────────────────────────

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      // createImageBitmap con imageOrientation:'from-image' aplica la rotación EXIF
      // automáticamente (fotos de iPhone rotadas) y acepta HEIC en Safari/iOS.
      // Es más eficiente que FileReader+Image y libera memoria GPU con bitmap.close().
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

      const MAX = 1024
      const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height))
      const w = Math.round(bitmap.width * scale)
      const h = Math.round(bitmap.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
      bitmap.close()

      // toBlob es más eficiente que toDataURL (no crea string gigante en memoria)
      canvas.toBlob((blob) => {
        if (!blob) return
        const reader = new FileReader()
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string
          setPendingImage({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', preview: dataUrl })
        }
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.85)
    } catch {
      // createImageBitmap no soportado (muy raro en browsers modernos) — ignorar
    }
  }

  const handleOpen = () => {
    if (!wasDraggedRef.current) setIsOpen(true)
    wasDraggedRef.current = false
  }

  return (
    <>
      {/* ── Floating button ──────────────────────────────────────────────── */}
      {!isOpen && mounted && (
        <button
          onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY) }}
          onTouchStart={(e) => { e.preventDefault(); handleDragStart(e.touches[0].clientX, e.touches[0].clientY) }}
          onClick={handleOpen}
          className={`z-[9999] cursor-grab active:cursor-grabbing transition-shadow ${
            variant === 'admin'
              ? 'h-14 w-14 rounded-full bg-white border border-slate-200 shadow-lg hover:shadow-xl hover:border-blue-300 flex items-center justify-center group'
              : 'h-12 w-12 rounded-full shadow-2xl flex items-center justify-center animate-float'
          }`}
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none' as React.CSSProperties['WebkitUserSelect'],
            background: variant === 'admin' ? undefined : 'linear-gradient(135deg, #0e1929 0%, #1e3a5f 100%)',
          }}
          title="Walter — Asistente IA"
        >
          {variant === 'admin' ? (
            <>
              <span className="text-base font-black text-slate-400 group-hover:text-blue-500 transition-colors" style={{ fontFamily: 'var(--font-syne)', letterSpacing: '-0.04em' }}>W</span>
              <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-blue-400 border-2 border-white" />
            </>
          ) : (
            <span className="text-white font-black text-sm" style={{ fontFamily: 'var(--font-syne)', letterSpacing: '-0.04em' }}>W</span>
          )}
        </button>
      )}

      {/* ── Chat panel (always mounted inside provider, shown via isOpen) ── */}
      <AssistantRuntimeProvider runtime={runtime}>
        <WalterChatPanel
          rol={rol}
          variant={variant}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          pendingImage={pendingImage}
          onImageSelect={handleImageSelect}
          onImageClear={() => setPendingImage(null)}
          fileInputRef={fileInputRef}
          cameraInputRef={cameraInputRef}
          suggestedAction={suggestedAction}
          onClearSuggestedAction={() => setSuggestedAction(null)}
          chart={chart}
          onClearChart={() => setChart(null)}
          incidenteCreado={incidenteCreado}
          onClearIncidenteCreado={() => setIncidenteCreado(null)}
          showCalendario={showCalendario}
          calendarioFranjas={calendarioFranjas}
          onCalendarioChange={setCalendarioFranjas}
          onCalendarioConfirm={() => { setShowCalendario(false); setCalendarioFranjas([]) }}
          inmueblesList={inmueblesList}
          onInmuebleSelect={() => setInmueblesList(null)}
          links={links}
          onClearLinks={() => setLinks(null)}
          imagePreviewsRef={imagePreviewsRef}
        />
      </AssistantRuntimeProvider>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

        .walter-prose { overflow-wrap: break-word; word-break: break-word; }
        .walter-prose p { margin: 0 0 0.5rem 0; }
        .walter-prose p:last-child { margin-bottom: 0; }
        .walter-prose strong { font-weight: 700; color: #1e293b; }
        .walter-prose ul { list-style: disc; padding-left: 1.25rem; margin: 0.25rem 0 0.5rem; }
        .walter-prose ol { list-style: decimal; padding-left: 1.25rem; margin: 0.25rem 0 0.5rem; }
        .walter-prose li { margin-bottom: 0.15rem; }
        .walter-prose h1, .walter-prose h2, .walter-prose h3 { font-weight: 700; margin: 0.5rem 0 0.25rem; color: #0f172a; }
      `}</style>
    </>
  )
}
