interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
}

export function AdminPageHeader({ title, subtitle, right }: AdminPageHeaderProps) {
  return (
    <div
      className="-mx-6 -mt-6 px-8 pt-7 pb-8 mb-6 rounded-b-[2rem] relative overflow-hidden"
      style={{ background: 'linear-gradient(155deg, #0e1929 0%, #131e32 60%, #0f1e2e 100%)' }}
    >
      <div
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.8) 0%, transparent 70%)' }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white leading-none tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-white/45 mt-1.5">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0 ml-4">{right}</div>}
      </div>
    </div>
  )
}
