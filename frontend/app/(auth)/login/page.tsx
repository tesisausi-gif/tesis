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
  show: { transition: { staggerChildren: 0.07 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

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
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Mobile logo — only shown when left panel is hidden */}
      <motion.div variants={item} className="flex items-center gap-2 mb-10 lg:hidden">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center"
          style={{ background: '#2563eb' }}
        >
          <span
            className="text-white font-bold text-xs"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            IS
          </span>
        </div>
        <span
          className="text-slate-400 text-xs tracking-[0.2em] uppercase"
          style={{ fontFamily: 'var(--font-outfit)' }}
        >
          ISBA
        </span>
      </motion.div>

      {/* Heading */}
      <motion.div variants={item} className="mb-8">
        <h2
          className="text-3xl font-bold text-slate-900 mb-2 leading-tight"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          Bienvenido
        </h2>
        <p className="text-slate-500 text-sm">
          Ingresá tus credenciales para acceder al sistema
        </p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-5">
        <motion.div variants={item}>
          <label
            htmlFor="email"
            className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-2"
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
            className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-sm"
          />
        </motion.div>

        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em]"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Contraseña
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
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
            className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-sm"
          />
        </motion.div>

        <motion.div variants={item}>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: loading ? '#1d4ed8' : '#2563eb',
              fontFamily: 'var(--font-syne)',
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8'
            }}
            onMouseLeave={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'
            }}
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
          </button>
        </motion.div>
      </form>

      {/* Footer */}
      <motion.p variants={item} className="mt-7 text-center text-sm text-slate-400">
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
