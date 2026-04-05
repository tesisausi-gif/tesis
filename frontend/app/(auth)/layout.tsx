import { Syne, Outfit } from 'next/font/google'
import { BrandPanel } from './_components/BrandPanel'
import { MobileBrandHeader } from './_components/MobileBrandHeader'

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
    <div
      className={`${syne.variable} ${outfit.variable} min-h-screen`}
      style={{ fontFamily: 'var(--font-outfit)' }}
    >
      {/* ── Mobile layout: stacked (header + overlapping card) ── */}
      <div className="lg:hidden flex flex-col min-h-screen" style={{ background: '#F7F6F3' }}>
        <MobileBrandHeader />

        {/* Form area — overlaps header with negative margin */}
        <div className="flex-1 px-4 pb-10 -mt-8 relative z-10">
          <div className="w-full max-w-sm mx-auto">
            {children}
          </div>
        </div>
      </div>

      {/* ── Desktop layout: side-by-side ── */}
      <div className="hidden lg:flex min-h-screen">
        <BrandPanel />

        {/* Right panel — form area */}
        <div
          className="flex-1 flex items-center justify-center p-8 md:p-12"
          style={{ background: '#F7F6F3' }}
        >
          <div className="w-full max-w-[360px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
