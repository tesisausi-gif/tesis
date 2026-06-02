'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { solicitarRecuperacionPassword } from '@/features/auth/recuperar-password.service'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    try {
      const result = await solicitarRecuperacionPassword(email.trim())

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setSent(true)
    } catch {
      toast.error('Error inesperado. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show">
      {/* Volver */}
      <div className="mb-5">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver al inicio de sesión
        </Link>
      </div>

      <div
        className="bg-white rounded-2xl p-8 md:p-9"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' }}
      >
        {sent ? (
          /* ── Estado: enviado ── */
          <div className="text-center space-y-4 py-2">
            <div className="flex justify-center">
              <div className="bg-emerald-100 rounded-full p-4">
                <Mail className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-slate-900 text-lg">¡Revisá tu correo!</p>
              <p className="text-sm text-slate-500">
                Enviamos una contraseña temporal a{' '}
                <span className="font-semibold text-slate-700">{email}</span>.
              </p>
              <p className="text-sm text-slate-500">
                Usala para ingresar — el sistema te pedirá elegir una contraseña nueva.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Si no lo ves, revisá la carpeta de spam.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Ir al inicio de sesión
            </Link>
          </div>
        ) : (
          /* ── Formulario ── */
          <>
            <div className="mb-6">
              <h2
                className="text-2xl font-bold text-slate-900 mb-1.5 tracking-tight"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Recuperar contraseña
              </h2>
              <p className="text-slate-500 text-[13.5px]">
                Ingresá tu correo y te enviamos una contraseña temporal para que puedas entrar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1.5"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 text-sm border-slate-200 bg-slate-50/70 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-semibold text-[13.5px] text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: '#2563eb', fontFamily: 'var(--font-syne)' }}
                whileHover={loading ? {} : { scale: 1.01, background: '#1d4ed8' }}
                whileTap={loading ? {} : { scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                {loading ? 'Enviando...' : 'Enviar contraseña temporal'}
              </motion.button>
            </form>
          </>
        )}
      </div>

      {!sent && (
        <p className="mt-5 text-center text-[13px] text-slate-400">
          ¿Recordaste tu contraseña?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
            Iniciá sesión
          </Link>
        </p>
      )}
    </motion.div>
  )
}
