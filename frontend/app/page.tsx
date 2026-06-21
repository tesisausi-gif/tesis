import { LandingHeader } from '@/components/landing/landing-header'
import { HeroSection } from '@/components/landing/hero-section'
import { StatsSection } from '@/components/landing/stats-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { CTASection } from '@/components/landing/cta-section'

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: '#060d1a' }}>
      <LandingHeader />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <footer
        className="py-8 border-t"
        style={{
          background: '#060d1a',
          borderColor: 'rgba(255,255,255,0.06)',
          fontFamily: 'var(--font-outfit)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 text-center text-sm" style={{ color: '#334155' }}>
          © {new Date().getFullYear()} Mantis — Sistema de Gestión de Incidentes
        </div>
      </footer>
    </div>
  )
}
