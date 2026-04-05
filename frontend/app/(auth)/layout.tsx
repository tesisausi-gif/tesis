import { BrandPanel } from './_components/BrandPanel'
import { MobileBrandHeader } from './_components/MobileBrandHeader'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--font-outfit)' }}>
      {/* ── Desktop: side-by-side ── */}
      <div className="hidden lg:flex min-h-screen">
        <BrandPanel />
        <div
          className="flex-1 flex items-center justify-center p-8 md:p-12"
          style={{ background: '#F7F6F3' }}
        >
          <div className="w-full max-w-[400px]">
            {children}
          </div>
        </div>
      </div>

      {/* ── Mobile: stacked ── */}
      <div className="lg:hidden flex flex-col min-h-screen" style={{ background: '#F7F6F3' }}>
        <MobileBrandHeader />
        <div className="flex-1 px-4 pb-10 -mt-8 relative z-10">
          <div className="w-full max-w-sm mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
