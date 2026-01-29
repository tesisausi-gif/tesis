import { LandingHeader } from '@/components/landing/landing-header'
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { CTASection } from '@/components/landing/cta-section'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          <p>&copy; {new Date().getFullYear()} Gestión de Incidentes. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
