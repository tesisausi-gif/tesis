'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail } from 'lucide-react'
import { createClient } from '@/shared/lib/supabase/client'
import { crearSolicitudRegistro, getEspecialidadesActivas, verificarEmailDisponible } from '@/features/usuarios/usuarios.service'
import { Input } from '@/components/ui/input'
import { AnimatedTabs, AnimatedTabContent } from '@/components/ui/animated-tabs'
import { toast } from 'sonner'
import { getAuthErrorMessage } from '@/shared/utils'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

function LabelText({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1.5"
      style={{ fontFamily: 'var(--font-syne)' }}
    >
      {children}
    </span>
  )
}

function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <motion.button
      type="submit"
      disabled={loading}
      className="w-full h-11 rounded-xl font-semibold text-[13.5px] text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
      style={{ background: '#2563eb', fontFamily: 'var(--font-syne)' }}
      whileHover={loading ? undefined : { scale: 1.01 }}
      whileTap={loading ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {loadingLabel}
        </>
      ) : label}
    </motion.button>
  )
}

function RegisterPageContent() {
  const [loading, setLoading] = useState(false)
  const [emailPendiente, setEmailPendiente] = useState('')
  const [confirmacionEnviada, setConfirmacionEnviada] = useState(false)
  const [especialidades, setEspecialidades] = useState<Array<{ id_especialidad: number; nombre: string }>>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const tipoParam = searchParams.get('tipo')
  const defaultTab = tipoParam === 'tecnico' ? 'tecnico' : 'cliente'
  const [activeTab, setActiveTab] = useState(defaultTab)

  const [clienteEmail, setClienteEmail] = useState('')
  const [clientePassword, setClientePassword] = useState('cliente123')
  const [clienteConfirmPassword, setClienteConfirmPassword] = useState('cliente123')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteApellido, setClienteApellido] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteDNI, setClienteDNI] = useState('')

  const [tecnicoNombre, setTecnicoNombre] = useState('')
  const [tecnicoApellido, setTecnicoApellido] = useState('')
  const [tecnicoEmail, setTecnicoEmail] = useState('')
  const [tecnicoTelefono, setTecnicoTelefono] = useState('')
  const [tecnicoDNI, setTecnicoDNI] = useState('')
  const [tecnicoEspecialidades, setTecnicoEspecialidades] = useState<string[]>([])
  const [tecnicoDireccion, setTecnicoDireccion] = useState('')

  useEffect(() => {
    getEspecialidadesActivas()
      .then(setEspecialidades)
      .catch(() => toast.error('Error al cargar especialidades'))
  }, [])

  const handleClienteRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteDNI) { toast.error('Por favor completa todos los campos obligatorios'); return }
    if (clientePassword !== clienteConfirmPassword) { toast.error('Las contraseñas no coinciden'); return }
    if (clientePassword.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }

    setLoading(true)
    try {
      const disponible = await verificarEmailDisponible(clienteEmail)
      if (!disponible) {
        toast.error('Email ya registrado', { description: 'Este correo ya está en uso. Iniciá sesión.' })
        setLoading(false)
        return
      }

      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/confirm?next=/cliente`
        : '/auth/confirm?next=/cliente'

      const { data, error } = await supabase.auth.signUp({
        email: clienteEmail,
        password: clientePassword,
        options: {
          emailRedirectTo: redirectTo,
          data: { nombre: clienteNombre, apellido: clienteApellido, rol: 'cliente', telefono: clienteTelefono, dni: clienteDNI },
        },
      })

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          toast.error('Email ya registrado', { description: 'Este correo ya está en uso.' })
        } else {
          const msg = getAuthErrorMessage(error)
          toast.error(msg.title, { description: msg.description })
        }
        return
      }

      if (data.user) {
        if (data.session === null) {
          setEmailPendiente(clienteEmail)
          setConfirmacionEnviada(true)
        } else {
          toast.success('Registro exitoso', { description: 'Ya puedes iniciar sesión' })
          setTimeout(() => router.push('/cliente'), 1500)
        }
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleTecnicoRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tecnicoNombre || !tecnicoApellido || !tecnicoEmail) {
      toast.error('Por favor completa los campos requeridos')
      return
    }

    setLoading(true)
    try {
      const result = await crearSolicitudRegistro({
        nombre: tecnicoNombre, apellido: tecnicoApellido, email: tecnicoEmail,
        telefono: tecnicoTelefono || null, dni: tecnicoDNI || null,
        especialidades: tecnicoEspecialidades, direccion: tecnicoDireccion || null,
      })

      if (!result.success) {
        toast.error('Error al enviar solicitud', { description: result.error })
        return
      }

      toast.success('Solicitud enviada', { description: 'Recibirás un email cuando sea aprobada' })
      setTecnicoNombre(''); setTecnicoApellido(''); setTecnicoEmail('')
      setTecnicoTelefono(''); setTecnicoDNI(''); setTecnicoEspecialidades([]); setTecnicoDireccion('')
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      toast.error('Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  // ── Email confirmation state ──
  if (confirmacionEnviada) {
    return (
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div
          className="bg-white rounded-2xl p-8 text-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-1" style={{ fontFamily: 'var(--font-syne)' }}>
            ¡Revisá tu correo!
          </h3>
          <p className="text-sm text-slate-500 mb-1" style={{ fontFamily: 'var(--font-outfit)' }}>
            Enviamos un enlace a{' '}
            <span className="font-medium text-slate-700">{emailPendiente}</span>
          </p>
          <p className="text-sm text-slate-400 mb-5" style={{ fontFamily: 'var(--font-outfit)' }}>
            Si no lo ves, revisá la carpeta de spam.
          </p>
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors" style={{ fontFamily: 'var(--font-syne)' }}>
            Volver al inicio de sesión
          </Link>
        </div>
      </motion.div>
    )
  }

  // ── Main form ──
  return (
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}>
      {/* Back link */}
      <motion.div variants={fadeUp}>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-slate-600 mb-5 transition-colors"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al inicio
        </Link>
      </motion.div>

      {/* Card */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl p-7"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' }}
      >
        {/* Heading */}
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight" style={{ fontFamily: 'var(--font-syne)' }}>
            Crear cuenta
          </h2>
          <p className="text-slate-500 text-[13.5px]" style={{ fontFamily: 'var(--font-outfit)' }}>
            Seleccioná tu tipo de cuenta
          </p>
        </div>

        {/* Tabs */}
        <AnimatedTabs
          tabs={[{ value: 'cliente', label: 'Cliente' }, { value: 'tecnico', label: 'Técnico' }]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab: Cliente */}
        <AnimatedTabContent value="cliente" activeTab={activeTab}>
          <form onSubmit={handleClienteRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <LabelText>Nombre *</LabelText>
                <Input id="cliente-nombre" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} required disabled={loading} className="h-10 text-sm border-slate-200 bg-slate-50/70" />
              </div>
              <div>
                <LabelText>Apellido *</LabelText>
                <Input id="cliente-apellido" value={clienteApellido} onChange={(e) => setClienteApellido(e.target.value)} required disabled={loading} className="h-10 text-sm border-slate-200 bg-slate-50/70" />
              </div>
            </div>
            <div>
              <LabelText>Email *</LabelText>
              <Input id="cliente-email" type="email" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} required disabled={loading} className="h-10 text-sm border-slate-200 bg-slate-50/70" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <LabelText>Teléfono</LabelText>
                <Input id="cliente-telefono" type="tel" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} disabled={loading} placeholder="+54 9 11..." className="h-10 text-sm border-slate-200 bg-slate-50/70" />
              </div>
              <div>
                <LabelText>DNI *</LabelText>
                <Input id="cliente-dni" value={clienteDNI} onChange={(e) => setClienteDNI(e.target.value)} required disabled={loading} placeholder="12345678" className="h-10 text-sm border-slate-200 bg-slate-50/70" />
              </div>
            </div>
            <div>
              <LabelText>Contraseña *</LabelText>
              <Input id="cliente-password" type="password" value={clientePassword} onChange={(e) => setClientePassword(e.target.value)} required disabled={loading} minLength={6} placeholder="Mínimo 6 caracteres" className="h-10 text-sm border-slate-200 bg-slate-50/70" />
            </div>
            <div>
              <LabelText>Confirmar Contraseña *</LabelText>
              <Input id="cliente-confirm" type="password" value={clienteConfirmPassword} onChange={(e) => setClienteConfirmPassword(e.target.value)} required disabled={loading} minLength={6} className="h-10 text-sm border-slate-200 bg-slate-50/70" />
            </div>
            <SubmitButton loading={loading} label="Registrarse como Cliente" loadingLabel="Registrando..." />
          </form>
        </AnimatedTabContent>

        {/* Tab: Técnico */}
        <AnimatedTabContent value="tecnico" activeTab={activeTab}>
          <form onSubmit={handleTecnicoRegister} className="space-y-4">
            <p className="text-sm text-slate-500" style={{ fontFamily: 'var(--font-outfit)' }}>
              Tu solicitud será revisada por un administrador antes de ser aprobada.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <LabelText>Nombre *</LabelText>
                <Input id="tecnico-nombre" value={tecnicoNombre} onChange={(e) => setTecnicoNombre(e.target.value)} required disabled={loading} className="h-10 text-sm border-slate-200 bg-slate-50/70" />
              </div>
              <div>
                <LabelText>Apellido *</LabelText>
                <Input id="tecnico-apellido" value={tecnicoApellido} onChange={(e) => setTecnicoApellido(e.target.value)} required disabled={loading} className="h-10 text-sm border-slate-200 bg-slate-50/70" />
              </div>
            </div>
            <div>
              <LabelText>Email *</LabelText>
              <Input id="tecnico-email" type="email" value={tecnicoEmail} onChange={(e) => setTecnicoEmail(e.target.value)} required disabled={loading} className="h-10 text-sm border-slate-200 bg-slate-50/70" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <LabelText>Teléfono</LabelText>
                <Input id="tecnico-telefono" type="tel" value={tecnicoTelefono} onChange={(e) => setTecnicoTelefono(e.target.value)} disabled={loading} className="h-10 text-sm border-slate-200 bg-slate-50/70" />
              </div>
              <div>
                <LabelText>DNI</LabelText>
                <Input id="tecnico-dni" value={tecnicoDNI} onChange={(e) => setTecnicoDNI(e.target.value)} disabled={loading} className="h-10 text-sm border-slate-200 bg-slate-50/70" />
              </div>
            </div>
            <div>
              <LabelText>Especialidades *</LabelText>
              <p className="text-xs text-slate-400 mb-2" style={{ fontFamily: 'var(--font-outfit)' }}>Podés seleccionar una o más.</p>
              <div className="grid grid-cols-2 gap-2">
                {especialidades.map((esp) => (
                  <label
                    key={esp.id_especialidad}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                      tecnicoEspecialidades.includes(esp.nombre)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                    style={{ fontFamily: 'var(--font-outfit)' }}
                  >
                    <input
                      type="checkbox"
                      checked={tecnicoEspecialidades.includes(esp.nombre)}
                      onChange={() => setTecnicoEspecialidades((prev) =>
                        prev.includes(esp.nombre) ? prev.filter((e) => e !== esp.nombre) : [...prev, esp.nombre]
                      )}
                      disabled={loading}
                      className="h-4 w-4 accent-blue-500"
                    />
                    {esp.nombre}
                  </label>
                ))}
              </div>
              {tecnicoEspecialidades.length === 0 && (
                <p className="text-xs text-amber-600 mt-1.5" style={{ fontFamily: 'var(--font-outfit)' }}>Seleccioná al menos una especialidad</p>
              )}
            </div>
            <div>
              <LabelText>Dirección</LabelText>
              <Input id="tecnico-direccion" value={tecnicoDireccion} onChange={(e) => setTecnicoDireccion(e.target.value)} disabled={loading} className="h-10 text-sm border-slate-200 bg-slate-50/70" />
            </div>
            <SubmitButton loading={loading} label="Enviar Solicitud" loadingLabel="Enviando..." />
          </form>
        </AnimatedTabContent>
      </motion.div>

      {/* Footer */}
      <p className="mt-5 text-center text-[13px] text-slate-400" style={{ fontFamily: 'var(--font-outfit)' }}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
          Iniciá sesión
        </Link>
      </p>
    </motion.div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-2xl p-8 text-center text-sm text-slate-400" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.07)' }}>
        Cargando...
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  )
}
