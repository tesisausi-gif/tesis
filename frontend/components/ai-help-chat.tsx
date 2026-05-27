'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sparkles, X, Send, Bot } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// Respuestas mockeadas del agente IA
const MOCK_RESPONSES = [
  {
    keywords: ['hola', 'buenos días', 'buenas tardes', 'hey', 'saludos'],
    response: '¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy? Puedo asistirte con preguntas sobre inmuebles, incidentes o cualquier consulta sobre el sistema.'
  },
  {
    keywords: ['inmueble', 'propiedad', 'casa', 'departamento', 'registrar'],
    response: 'Para registrar un inmueble, ve a la sección "Mis Inmuebles" y haz clic en "Agregar Inmueble". Necesitarás completar datos como tipo de inmueble, dirección (provincia, localidad, calle, altura) y opcionalmente piso y departamento. ¿Necesitas ayuda con algo específico?'
  },
  {
    keywords: ['incidente', 'problema', 'reportar', 'reclamo'],
    response: 'Para reportar un incidente, primero debes tener al menos un inmueble registrado. Luego, haz clic en "Reportar Nuevo Incidente" desde el panel principal o la sección de Incidentes. Describe el problema y selecciona la propiedad afectada. ¿Hay algo más en lo que pueda ayudarte?'
  },
  {
    keywords: ['editar', 'modificar', 'cambiar'],
    response: 'Puedes editar tus inmuebles desde la sección "Mis Inmuebles". Cada tarjeta de inmueble tiene un menú de opciones (tres puntos) donde puedes Editar, Dar de baja/Activar o Eliminar. ¿Necesitas ayuda con alguna edición en particular?'
  },
  {
    keywords: ['eliminar', 'borrar', 'quitar'],
    response: 'Para eliminar un inmueble, ve a "Mis Inmuebles", haz clic en el menú de opciones (tres puntos) del inmueble que deseas eliminar y selecciona "Eliminar". Se te pedirá confirmación antes de proceder. Ten en cuenta que esta acción es permanente. ¿Tienes alguna otra duda?'
  },
  {
    keywords: ['ayuda', 'help', 'no entiendo', 'como'],
    response: 'Estoy aquí para ayudarte con cualquier duda sobre el sistema. Puedes preguntarme sobre:\n\n• Cómo registrar o gestionar inmuebles\n• Cómo reportar incidentes\n• Cómo ver el estado de tus reportes\n• Navegación por el sistema\n\n¿Qué necesitas saber?'
  },
  {
    keywords: ['gracias', 'muchas gracias', 'perfecto', 'ok', 'entendido'],
    response: '¡De nada! 😊 Estoy aquí si necesitas más ayuda. No dudes en consultarme cualquier cosa.'
  }
]

const getAIResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase()

  // Buscar coincidencia con palabras clave
  for (const mockResponse of MOCK_RESPONSES) {
    if (mockResponse.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return mockResponse.response
    }
  }

  // Respuesta por defecto
  return 'Entiendo tu consulta. En este momento, puedo ayudarte con información sobre el registro de inmuebles, reporte de incidentes y navegación del sistema. ¿Podrías reformular tu pregunta o ser más específico sobre lo que necesitas?'
}

interface AIHelpChatProps {
  variant?: 'floating' | 'admin'
}

export function AIHelpChat({ variant = 'floating' }: AIHelpChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Establecer posición inicial
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth - 64,
        y: window.innerHeight - 160,
      })
      setMounted(true)
    }
  }, [])

  // Manejar drag con touch y mouse
  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true)
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y,
    })
  }

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return

    const newX = clientX - dragStart.x
    const newY = clientY - dragStart.y

    // Limitar a los bordes de la pantalla
    const maxX = window.innerWidth - 48
    const maxY = window.innerHeight - 48

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Event listeners
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX, e.clientY)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    handleDragStart(touch.clientX, touch.clientY)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0]
        handleDragMove(touch.clientX, touch.clientY)
      }
    }

    const handleEnd = () => {
      handleDragEnd()
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, dragStart, position])

  const handleClick = () => {
    // Solo abrir si no se arrastró mucho
    if (!isDragging) {
      setIsOpen(true)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    // Simular tiempo de respuesta del agente IA
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(userMessage.content),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 800 + Math.random() * 1200) // Entre 0.8 y 2 segundos
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Botón flotante (técnico / cliente) */}
      {variant === 'floating' && !isOpen && mounted && (
        <button
          ref={buttonRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleClick}
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          className="h-12 w-12 rounded-full shadow-2xl hover:shadow-3xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 flex items-center justify-center border-0 z-[9999] cursor-grab active:cursor-grabbing transition-shadow animate-float"
        >
          <Bot className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Botón discreto admin (no flota, no arrastra) */}
      {variant === 'admin' && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-10 w-10 rounded-full z-[9999] flex items-center justify-center bg-white border border-slate-200 shadow-md hover:shadow-lg hover:border-indigo-300 transition-all group"
          title="Asistente IA"
        >
          <Bot className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-indigo-400 border-2 border-white" />
        </button>
      )}

      {/* Ventana de chat */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[90vw] md:w-96 h-[500px] shadow-2xl z-50 flex flex-col">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Asistente Virtual</CardTitle>
                  <p className="text-xs text-blue-100">Estoy aquí para ayudarte</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu consulta..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Estilos de animación */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}
