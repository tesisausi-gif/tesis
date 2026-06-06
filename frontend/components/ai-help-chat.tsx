'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Send, ImagePlus, XCircle, ArrowRight } from 'lucide-react'
import { sendMessageToWalter } from '@/features/walter/walter.service'
import type { WalterMessage, WalterRol, WalterSuggestedAction } from '@/features/walter/walter.types'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  imagePreview?: string
  suggestedAction?: WalterSuggestedAction
}

interface AIHelpChatProps {
  variant?: 'floating' | 'admin'
  rol?: WalterRol
}

// ── Quick actions por rol ─────────────────────────────────────────────────────

const QUICK_ACTIONS: Record<WalterRol, { label: string; message: string }[]> = {
  cliente: [
    { label: '📸 Diagnosticar problema', message: 'Quiero diagnosticar un problema en mi propiedad. ¿Cómo empezamos?' },
    { label: '❓ Ayuda con el sistema', message: '¿Cómo funciona el sistema? ¿Qué puedo hacer desde mi cuenta?' },
    { label: '📋 Estado de mis incidentes', message: '¿Cómo puedo ver el estado de mis incidentes y qué significa cada estado?' },
  ],
  tecnico: [
    { label: '🔧 Mi flujo de trabajo', message: '¿Cuál es el flujo completo de trabajo que debo seguir para un incidente asignado?' },
    { label: '❓ Ayuda con el sistema', message: '¿Cómo funciona el portal técnico? ¿Qué puedo hacer desde mi cuenta?' },
    { label: '📋 Etapas de un trabajo', message: 'Explicame las etapas de un trabajo desde la inspección hasta el cobro.' },
  ],
  admin: [
    { label: '📊 Analizar métricas', message: '¿Qué métricas del sistema me podés ayudar a analizar?' },
    { label: '🔧 Gestión operativa', message: '¿En qué me podés asistir para la gestión del día a día?' },
    { label: '📸 Diagnosticar incidente', message: 'Quiero analizar un problema reportado para categorizarlo correctamente.' },
  ],
}

const WELCOME_MESSAGES: Record<WalterRol, string> = {
  cliente: '¡Hola! Soy Walter 👋\nPuedo ayudarte a diagnosticar problemas en tus propiedades y guiarte en el uso del sistema.',
  tecnico: '¡Hola! Soy Walter 👋\nPuedo guiarte en tu flujo de trabajo y ayudarte con cualquier duda sobre el sistema.',
  admin: '¡Hola! Soy Walter 👋\nPuedo ayudarte a analizar métricas, diagnosticar incidentes y asistirte en la gestión operativa.',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AIHelpChat({ variant = 'floating', rol = 'cliente' }: AIHelpChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null)

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const wasDraggedRef = useRef(false)
  const isSubmittingRef = useRef(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Historial para enviar a la API (sin imagePreview ni suggestedAction)
  const historyRef = useRef<WalterMessage[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({ x: window.innerWidth - 64, y: window.innerHeight - 160 })
      setMounted(true)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Mostrar mensaje de bienvenida al abrir por primera vez
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: WELCOME_MESSAGES[rol],
      }])
    }
  }, [isOpen, rol])

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
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      const base64 = result.split(',')[1]
      setPendingImage({ base64, mimeType: file.type, preview: result })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Send message ─────────────────────────────────────────────────────────────

  const sendMessage = async (content: string, quickAction = false) => {
    if (isSubmittingRef.current) return
    const text = content.trim()
    if (!text && !pendingImage) return

    isSubmittingRef.current = true
    setIsLoading(true)

    const userDisplay: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text || '📸 (imagen adjunta)',
      imagePreview: pendingImage?.preview,
    }
    setMessages(prev => [...prev, userDisplay])

    const walterMsg: WalterMessage = {
      role: 'user',
      content: text,
      imageBase64: pendingImage?.base64,
      imageMimeType: pendingImage?.mimeType,
    }
    historyRef.current = [...historyRef.current, walterMsg]

    setInput('')
    setPendingImage(null)

    try {
      const result = await sendMessageToWalter(historyRef.current, rol)

      if (!result.success || !result.content) {
        const errDisplay: DisplayMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.error ?? 'Error inesperado. Intentá de nuevo.',
        }
        setMessages(prev => [...prev, errDisplay])
      } else {
        historyRef.current = [...historyRef.current, { role: 'assistant', content: result.content }]
        const assistantDisplay: DisplayMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.content,
          suggestedAction: result.suggestedAction,
        }
        setMessages(prev => [...prev, assistantDisplay])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'No pude conectarme. Verificá tu conexión e intentá de nuevo.',
      }])
    } finally {
      isSubmittingRef.current = false
      setIsLoading(false)
    }
  }

  const handleSubmit = () => sendMessage(input)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const handleOpen = () => {
    if (!wasDraggedRef.current) setIsOpen(true)
    wasDraggedRef.current = false
  }

  const hasUserMessages = messages.some(m => m.role === 'user')
  const quickActions = QUICK_ACTIONS[rol]

  return (
    <>
      {/* ── Botón flotante ────────────────────────────────────────────────── */}
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

      {/* ── Ventana de chat ───────────────────────────────────────────────── */}
      {isOpen && (
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
                <p className="text-blue-300/60 text-[10px] mt-0.5">Asistente Traki · IA</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* Image preview */}
                  {msg.imagePreview && (
                    <img src={msg.imagePreview} alt="adjunto" className="rounded-xl max-h-40 object-cover border border-slate-200" />
                  )}
                  {/* Bubble */}
                  {msg.content && msg.content !== '📸 (imagen adjunta)' && (
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'text-white rounded-tr-sm'
                          : 'text-slate-800 bg-slate-100 rounded-tl-sm'
                      }`}
                      style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)' } : undefined}
                    >
                      {msg.content}
                    </div>
                  )}
                  {/* Suggested action */}
                  {msg.suggestedAction && (
                    <Link href={msg.suggestedAction.url} onClick={() => setIsOpen(false)}>
                      <div
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm font-semibold cursor-pointer hover:brightness-105 transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #0e1929 0%, #1e3a5f 100%)', color: '#93c5fd' }}
                      >
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                        {msg.suggestedAction.label}
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions (solo si no hay mensajes del usuario aún) */}
          {!hasUserMessages && !isLoading && (
            <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              {quickActions.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => sendMessage(qa.message, true)}
                  className="shrink-0 text-[11px] font-medium px-2.5 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all whitespace-nowrap"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          {/* Image preview pending */}
          {pendingImage && (
            <div className="px-3 pt-2 bg-white border-t border-slate-100 shrink-0">
              <div className="relative inline-block">
                <img src={pendingImage.preview} alt="adjunto" className="h-16 rounded-xl object-cover border border-slate-200" />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-700 text-white flex items-center justify-center"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 bg-white border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-blue-300 transition-colors">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí tu consulta..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none py-1"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors shrink-0"
                title="Adjuntar imagen"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || (!input.trim() && !pendingImage)}
                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #0e1929 0%, #1d4ed8 100%)' }}
              >
                <Send className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </div>
        </div>
      )}

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
