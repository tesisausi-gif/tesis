'use client'

import { useMotionValue, animate, motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import useMeasure from 'react-use-measure'

type InfiniteSliderProps = {
  children: React.ReactNode
  gap?: number
  speed?: number
  speedOnHover?: number
  reverse?: boolean
  className?: string
}

export function InfiniteSlider({
  children,
  gap = 16,
  speed = 60,
  speedOnHover,
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const [currentSpeed, setCurrentSpeed] = useState(speed)
  const [ref, { width }] = useMeasure()
  const translation = useMotionValue(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (width === 0) return
    const contentSize = width + gap
    const from = reverse ? -contentSize / 2 : 0
    const to = reverse ? 0 : -contentSize / 2
    const duration = Math.abs(to - from) / currentSpeed

    let controls: ReturnType<typeof animate>

    if (isTransitioning) {
      const remaining = Math.abs(translation.get() - to)
      controls = animate(translation, [translation.get(), to], {
        ease: 'linear',
        duration: remaining / currentSpeed,
        onComplete: () => { setIsTransitioning(false); setKey(k => k + 1) },
      })
    } else {
      controls = animate(translation, [from, to], {
        ease: 'linear',
        duration,
        repeat: Infinity,
        repeatType: 'loop',
        repeatDelay: 0,
        onRepeat: () => translation.set(from),
      })
    }

    return () => controls.stop()
  }, [key, translation, currentSpeed, width, gap, isTransitioning, reverse])

  const hoverProps = speedOnHover ? {
    onHoverStart: () => { setIsTransitioning(true); setCurrentSpeed(speedOnHover) },
    onHoverEnd: () => { setIsTransitioning(true); setCurrentSpeed(speed) },
  } : {}

  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      <motion.div
        ref={ref}
        className="flex w-max"
        style={{ x: translation, gap: `${gap}px` }}
        {...hoverProps}
      >
        {children}
        {children}
      </motion.div>
    </div>
  )
}
