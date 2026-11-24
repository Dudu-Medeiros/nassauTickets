import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export interface AlertProps {
  variant?: AlertVariant
  titulo?: string
  children: ReactNode
  className?: string
}

const ESTILOS: Record<AlertVariant, string> = {
  info: 'border-sky-500/40 bg-sky-950/60 text-sky-100',
  success: 'border-emerald-500/40 bg-emerald-950/60 text-emerald-100',
  warning: 'border-amber-500/40 bg-amber-950/60 text-amber-100',
  error: 'border-rose-500/40 bg-rose-950/60 text-rose-100',
}

const ICONES: Record<AlertVariant, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
}

export function Alert({
  variant = 'info',
  titulo,
  children,
  className = '',
}: AlertProps) {
  const Icone = ICONES[variant]
  const ehUrgente = variant === 'error' || variant === 'warning'

  return (
    <div
      role={ehUrgente ? 'alert' : 'status'}
      aria-live={ehUrgente ? 'assertive' : 'polite'}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${ESTILOS[variant]} ${className}`}
    >
      <Icone aria-hidden="true" className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}