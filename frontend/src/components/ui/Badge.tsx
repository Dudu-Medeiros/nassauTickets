import type { ReactNode } from 'react'

type BadgeTone = 'neutral' | 'sky' | 'amber' | 'emerald' | 'rose' | 'violet'

export interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

const TONS: Record<BadgeTone, string> = {
  neutral: 'bg-slate-800 text-slate-200 border-slate-700',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
}

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide leading-none ${TONS[tone]} ${className}`}
    >
      {children}
    </span>
  )
}