import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-slate-700 bg-slate-900 p-6 ${className}`} {...rest} />
}
