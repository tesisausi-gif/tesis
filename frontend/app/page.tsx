import { LandingHeader } from '@/components/landing/landing-header'
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { CTASection } from '@/components/landing/cta-section'

export default function Home() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <footer
        className="py-8 border-t"
        style={{ background: 'white', borderColor: 'rgba(0,0,0,0.06)', fontFamily: 'var(--font-outfit)' }}
      >
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} ISBA — Sistema de Gestión de Incidentes
        </div>
      </footer>
    </div>
  )
}
