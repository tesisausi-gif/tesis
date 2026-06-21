'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

/**
 * Ícono del logo de Mantis con efecto 3D parallax interactivo.
 * - Desktop: sigue el cursor
 * - Mobile: sigue el dedo (touchmove) y, si está disponible, el giroscopio
 *
 * Implementación: perspective + rotateX/rotateY animado con spring CSS.
 * Incluye gloss highlight reflectivo que se mueve en sentido inverso al tilt.
 */
export function MantisIcon3D() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const MAX = 22

    const updateFromPoint = (clientX: number, clientY: number) => {
      const el = wrapperRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (clientX - cx) / Math.max(window.innerWidth / 2, 1)
      const dy = (clientY - cy) / Math.max(window.innerHeight / 2, 1)
      setTilt({
        x: Math.max(-MAX, Math.min(MAX, -dy * MAX)),
        y: Math.max(-MAX, Math.min(MAX, dx * MAX)),
      })
    }

    const onMouseMove = (e: MouseEvent) => updateFromPoint(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return
      updateFromPoint(e.touches[0].clientX, e.touches[0].clientY)
    }

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return
      const x = Math.max(-MAX, Math.min(MAX, -(e.beta - 45) * 0.6))
      const y = Math.max(-MAX, Math.min(MAX, e.gamma * 0.8))
      setTilt({ x, y })
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('deviceorientation', onOrientation, true)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('deviceorientation', onOrientation, true)
    }
  }, [])

  const easing = 'cubic-bezier(0.18, 0.9, 0.25, 1)'
  const tx = tilt.x
  const ty = tilt.y
  const glossX = 50 - ty * 1.5
  const glossY = 50 + tx * 1.5

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="relative"
      style={{
        width: 108,
        height: 108,
        perspective: '900px',
        animation: 'mantis-float 6s ease-in-out infinite',
      }}
    >
      {/* Halo blando atrás */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.55) 0%, rgba(37,99,235,0.22) 35%, transparent 70%)',
          transform: `scale(2.3) translateZ(-60px) translate(${ty * 0.3}px, ${-tx * 0.3}px)`,
          filter: 'blur(22px)',
          transition: `transform 400ms ${easing}`,
        }}
      />

      {/* Tarjeta 3D */}
      <div
        className="relative w-full h-full rounded-3xl overflow-hidden"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tx}deg) rotateY(${ty}deg) translateZ(0)`,
          transition: `transform 400ms ${easing}, box-shadow 300ms ease-out`,
          boxShadow: isHovering
            ? `${-ty * 0.6}px ${tx * 0.6 + 16}px 48px rgba(37,99,235,0.45), 0 2px 12px rgba(0,0,0,0.55)`
            : '0 12px 40px rgba(37,99,235,0.30), 0 2px 10px rgba(0,0,0,0.5)',
          border: '1px solid rgba(96,165,250,0.28)',
          willChange: 'transform',
        }}
      >
        {/* Imagen del logo */}
        <Image
          src="/icon-192.png"
          alt="Mantis"
          width={108}
          height={108}
          priority
          className="h-full w-full object-cover select-none pointer-events-none"
          draggable={false}
        />

        {/* Gloss reflectivo que sigue el ángulo inverso */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen"
          style={{
            background: `radial-gradient(circle at ${glossX}% ${glossY}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.0) 38%)`,
            transition: `background 400ms ${easing}`,
          }}
        />

        {/* Capa de borde superior con sutil viñeta */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 50%, rgba(0,0,0,0.18) 100%)',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes mantis-float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
