'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/shared/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { getAuthErrorMessage } from '@/shared/utils'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'enlace_invalido') {
      toast.error('Enlace inválido o expirado', {
        description: 'El enlace de verificación no es válido. Solicitá uno nuevo.',
      })
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Intentando login con email:', email)

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      console.log('Respuesta de Supabase:', { data, error })

      if (error) {
        console.error('Error de login:', error)
        const errorMsg = getAuthErrorMessage(error)
        toast.error(errorMsg.title, { description: errorMsg.description })
        setLoading(false)
        return
      }

      if (data.user) {
        console.log('Login exitoso, obteniendo rol del usuario...')

        const { data: usuarioData, error: usuarioError } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', data.user.id)
          .single()

        if (usuarioError || !usuarioData) {
          console.error('Error al obtener datos del usuario:', usuarioError)
          toast.error('Error al obtener información del usuario')
          setLoading(false)
          return
        }

        const rol = usuarioData.rol
        console.log('Rol del usuario:', rol)
        toast.success('Inicio de sesión exitoso')

        switch (rol) {
          case 'admin':
          case 'gestor':
            router.push('/dashboard')
            break
          case 'cliente':
            router.push('/cliente')
            break
          case 'tecnico':
            router.push('/tecnico')
            break
          default:
            router.push('/dashboard')
        }

        router.refresh()
      } else {
        console.error('No se recibió usuario en la respuesta')
        toast.error('Error al iniciar sesión', {
          description: 'No se pudo obtener información del usuario',
        })
        setLoading(false)
      }
    } catch (error) {
      console.error('Error catch:', error)
      const errorMsg = getAuthErrorMessage(error)
      toast.error(errorMsg.title, { description: errorMsg.description })
      setLoading(false)
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Card */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl p-8 md:p-9"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' }}
      >
        {/* Heading */}
        <div className="mb-7">
          <h2
            className="text-2xl font-bold text-slate-900 mb-1.5 tracking-tight"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Bienvenido
          </h2>
          <p className="text-slate-500 text-[13.5px]">
            Ingresá tus credenciales para acceder al sistema
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <motion.div variants={fadeUp}>
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
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-11 text-sm border-slate-200 bg-slate-50/70 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors"
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-[12px] text-blue-600 hover:text-blue-700 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-11 text-sm border-slate-200 bg-slate-50/70 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors"
            />
          </motion.div>

          <motion.div variants={fadeUp} className="pt-1">
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold text-[13.5px] text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#2563eb', fontFamily: 'var(--font-syne)' }}
              whileHover={loading ? {} : { scale: 1.01, background: '#1d4ed8' }}
              whileTap={loading ? {} : { scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </motion.button>
          </motion.div>
        </form>
      </motion.div>

      {/* Footer */}
      <motion.p variants={fadeUp} className="mt-5 text-center text-[13px] text-slate-400">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
          Regístrate aquí
        </Link>
      </motion.p>
    </motion.div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}
