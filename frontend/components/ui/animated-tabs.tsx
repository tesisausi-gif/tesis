'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/shared/utils'

interface AnimatedTabsProps {
  tabs: { value: string; label: string }[]
  activeTab: string
  onTabChange: (value: string) => void
  className?: string
}

export function AnimatedTabs({ tabs, activeTab, onTabChange, className }: AnimatedTabsProps) {
  return (
    <div
      className={cn(
        'bg-muted inline-flex h-10 w-full items-center justify-center rounded-lg p-1',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            'relative flex-1 inline-flex h-8 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            activeTab === tab.value
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground/80'
          )}
        >
          {activeTab === tab.value && (
            <motion.div
              layoutId="active-tab-indicator"
              className="absolute inset-0 bg-background rounded-md shadow-sm"
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
              }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

interface AnimatedTabContentProps {
  value: string
  activeTab: string
  children: React.ReactNode
  className?: string
}

export function AnimatedTabContent({ value, activeTab, children, className }: AnimatedTabContentProps) {
  if (value !== activeTab) return null

  return (
    <motion.div
      key={value}
      initial={{ opacity: 0, x: value === 'cliente' ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: value === 'cliente' ? 10 : -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('mt-4', className)}
    >
      {children}
    </motion.div>
  )
}
