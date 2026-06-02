'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MailCheck, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { enviarCodigoVerificacion, verificarCodigoEmail } from '@/features/clientes/verificacion-email.service'

interface Props {
  idCliente: number
  email: string
  nombre: string
  onSuccess: () => void
}

const COOLDOWN = 60

export function VerificarEmailOverlay({ idCliente, email, nombre, onSuccess }: Props) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [verificando, setVerificando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const iniciarCooldown = useCallback(() => {
    setCooldown(COOLDOWN)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    // Enviar código automáticamente al montar
    setEnviando(true)
    enviarCodigoVerificacion(idCliente, email, nombre)
      .then(res => {
        if (!res.success) toast.error('No se pudo enviar el código', { description: res.error })
        else iniciarCooldown()
      })
      .finally(() => setEnviando(false))

    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [idCliente, email, nombre, iniciarCooldown])

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  const codigo = digits.join('')
  const completo = codigo.length === 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!completo) return
    setVerificando(true)
    try {
      const res = await verificarCodigoEmail(idCliente, codigo)
      if (!res.success) {
        toast.error(res.error)
        setDigits(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }
      toast.success('Email verificado correctamente')
      onSuccess()
    } finally {
      setVerificando(false)
    }
  }

  const handleReenviar = async () => {
    if (cooldown > 0 || enviando) return
    setEnviando(true)
    try {
      const res = await enviarCodigoVerificacion(idCliente, email, nombre)
      if (!res.success) {
        toast.error('No se pudo reenviar el código', { description: res.error })
        return
      }
      toast.success('Código reenviado')
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      iniciarCooldown()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 pt-6 pb-5 flex items-start gap-3">
          <div className="bg-white/20 rounded-full p-2 shrink-0">
            <MailCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">Verificá tu correo</p>
            <p className="text-blue-100 text-xs mt-1">
              Enviamos un código de 6 dígitos a <strong>{email}</strong>
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Código de verificación</label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                  className="w-11 h-12 text-center text-xl font-bold rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              ))}
            </div>
          </div>

          {completo && (
            <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Código listo para verificar
            </div>
          )}

          <button
            type="submit"
            disabled={!completo || verificando}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            {verificando ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</>
            ) : (
              'Verificar cuenta'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleReenviar}
              disabled={cooldown > 0 || enviando}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1 mx-auto transition-colors"
            >
              {enviando ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Enviando...</>
              ) : cooldown > 0 ? (
                <>Reenviar en {cooldown}s</>
              ) : (
                <><RefreshCw className="h-3 w-3" /> Reenviar código</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
