'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  ThreadPrimitive,
  ComposerPrimitive,
  useThreadRuntime,
  useThread,
  type ChatModelAdapter,
} from '@assistant-ui/react'
import { Button } from '@/components/ui/button'
import { X, Send, ImagePlus, XCircle, ArrowRight } from 'lucide-react'
import { sendMessageToWalter } from '@/features/walter/walter.service'
import type { WalterMessage, WalterRol, WalterSuggestedAction } from '@/features/walter/walter.types'
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
    { label: '📸 Diagnosticar incidente', message: 'Quiero analizar un problema reportado para categorizarlo.' },
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
  suggestedAction: WalterSuggestedAction | null
  onClearSuggestedAction: () => void
  imagePreviewsRef: React.MutableRefObject<Map<string, string>>
}

function WalterChatPanel({
  rol,
  isOpen,
  onClose,
  pendingImage,
  onImageSelect,
  onImageClear,
  fileInputRef,
  suggestedAction,
  onClearSuggestedAction,
  imagePreviewsRef,
}: WalterChatPanelProps) {
  const threadRuntime = useThreadRuntime()
  const isRunning = useThread((s) => s.isRunning)
  const messageCount = useThread((s) => s.messages.length)
  const hasUserMessages = useThread((s) => s.messages.some((m) => m.role === 'user'))
  const quickActions = QUICK_ACTIONS[rol]

  // Clear suggested action when a new user message is being processed
  useEffect(() => {
    if (isRunning) onClearSuggestedAction()
  }, [isRunning])

  const sendQuickAction = (message: string) => {
    threadRuntime.append({ role: 'user', content: [{ type: 'text', text: message }] })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed bottom-6 right-4 w-[92vw] sm:w-96 flex flex-col rounded-2xl overflow-hidden shadow-2xl z-[9999]"
      style={{ height: '520px', border: '1px solid rgba(255,255,255,0.08)' }}
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
              Asistente Traki · IA
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
      <ThreadPrimitive.Root className="flex-1 flex flex-col overflow-hidden bg-white">
        <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-4">
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
              const parts = (message as unknown as { content: Array<{ type: string; text?: string }> }).content
              const textContent = parts.find((p) => p.type === 'text')?.text ?? ''

              if (message.role === 'user') {
                const imagePreview = imagePreviewsRef.current.get(message.id)
                return (
                  <div className="flex justify-end mb-3">
                    <div className="max-w-[82%] space-y-1 flex flex-col items-end">
                      {imagePreview && (
                        <img src={imagePreview} alt="adjunto" className="rounded-xl max-h-40 object-cover border border-slate-200" />
                      )}
                      {textContent && (
                        <div
                          className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed whitespace-pre-wrap text-white"
                          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)' }}
                        >
                          {textContent}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              // Assistant message
              return (
                <div className="flex justify-start mb-3">
                  <div className="max-w-[82%] space-y-1 flex flex-col items-start">
                    {textContent && (
                      <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-wrap text-slate-800 bg-slate-100">
                        {textContent}
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

        {/* Suggested action button */}
        {suggestedAction && !isRunning && (
          <div className="px-3 py-2 bg-white border-t border-slate-100 shrink-0">
            <Link href={suggestedAction.url} onClick={onClose}>
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer hover:brightness-105 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0e1929 0%, #1e3a5f 100%)', color: '#93c5fd' }}
              >
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                {suggestedAction.label}
              </div>
            </Link>
          </div>
        )}

        {/* Quick actions (only before first user message) */}
        {!hasUserMessages && !isRunning && (
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={() => sendQuickAction(qa.message)}
                className="shrink-0 text-[11px] font-medium px-2.5 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all whitespace-nowrap"
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
              onClick={() => fileInputRef.current?.click()}
              disabled={isRunning}
              className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors shrink-0"
              title="Adjuntar imagen"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <ComposerPrimitive.Send asChild>
              <button
                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #0e1929 0%, #1d4ed8 100%)' }}
              >
                <Send className="h-3.5 w-3.5 text-white" />
              </button>
            </ComposerPrimitive.Send>
          </div>
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

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const wasDraggedRef = useRef(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Refs for adapter closures (always hold current values)
  const pendingImageRef = useRef<PendingImage | null>(null)
  const imagePreviewsRef = useRef(new Map<string, string>())
  const setSuggestedActionRef = useRef(setSuggestedAction)
  const clearPendingImageRef = useRef(() => setPendingImage(null))

  useEffect(() => { pendingImageRef.current = pendingImage }, [pendingImage])
  useEffect(() => { setSuggestedActionRef.current = setSuggestedAction }, [])
  useEffect(() => { clearPendingImageRef.current = () => setPendingImage(null) }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({ x: window.innerWidth - 64, y: window.innerHeight - 160 })
      setMounted(true)
    }
  }, [])

  // ── Chat model adapter ──────────────────────────────────────────────────────

  const adapter = useMemo((): ChatModelAdapter => ({
    async run({ messages }) {
      const pendingImg = pendingImageRef.current

      // Get last user message for image attachment and preview storage
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')

      // Store image preview keyed by message ID for display
      if (pendingImg && lastUserMsg) {
        imagePreviewsRef.current.set(lastUserMsg.id, pendingImg.preview)
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

      const result = await sendMessageToWalter(walterMessages, rol)

      if (!result.success) {
        throw new Error(result.error ?? 'Error desconocido')
      }

      // Update state after successful run
      pendingImageRef.current = null
      clearPendingImageRef.current()
      setSuggestedActionRef.current(result.suggestedAction ?? null)

      return {
        content: [{ type: 'text', text: result.content ?? '' }],
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.size > 10 * 1024 * 1024) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      const base64 = result.split(',')[1]
      setPendingImage({ base64, mimeType: file.type, preview: result })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
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
          suggestedAction={suggestedAction}
          onClearSuggestedAction={() => setSuggestedAction(null)}
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
      `}</style>
    </>
  )
}
