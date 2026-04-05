import { Syne, Outfit } from 'next/font/google'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${syne.variable} ${outfit.variable} min-h-screen flex`} style={{ fontFamily: 'var(--font-outfit)' }}>
      {/* Left Panel — Brand Identity */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#0f172a' }}
      >
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Glow accents */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }}
        />

        {/* Vertical accent bar */}
        <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-transparent via-blue-500 to-transparent opacity-60" />

        <div className="relative z-10">
          {/* Logo mark */}
          <div className="flex items-center gap-3 mb-16">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: '#2563eb' }}
            >
              <span
                className="text-white font-bold text-sm tracking-tight"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                IS
              </span>
            </div>
            <span
              className="text-white/40 text-xs tracking-[0.25em] uppercase"
              style={{ fontFamily: 'var(--font-outfit)' }}
            >
              ISBA
            </span>
          </div>

          {/* Main heading */}
          <h1
            className="text-5xl xl:text-[56px] font-bold text-white leading-[1.1] mb-6"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Gestión de<br />
            <span style={{ color: '#60a5fa' }}>Incidentes</span>
          </h1>

          <p className="text-slate-400 text-[15px] leading-relaxed mb-12 max-w-xs">
            Plataforma centralizada para el seguimiento y resolución de incidentes de la inmobiliaria.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              'Seguimiento en tiempo real',
              'Asignación de técnicos',
              'Reportes y conformidades',
            ].map((label) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#3b82f6' }} />
                <span className="text-slate-300 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom footer */}
        <div className="relative z-10">
          <div className="h-px mb-6" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <p className="text-slate-600 text-xs">
            © 2025 ISBA — Sistema de Gestión de Incidentes
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 md:p-12">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
