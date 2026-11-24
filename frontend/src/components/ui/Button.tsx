import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  carregando?: boolean
  textoCarregando?: string
  children: ReactNode
}

const VARIANTES: Record<ButtonVariant, string> = {
  primary:
    'bg-sky-500 text-slate-950 hover:bg-sky-400 focus-visible:ring-sky-300 font-semibold',
  secondary:
    'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 focus-visible:ring-slate-400 font-medium',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-300 font-semibold',
  success:
    'bg-emerald-500 text-slate-950 hover:bg-emerald-400 focus-visible:ring-emerald-300 font-semibold',
  ghost:
    'bg-transparent text-slate-200 hover:bg-slate-800/80 focus-visible:ring-slate-400 font-medium',
}

const TAMANHOS: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  carregando = false,
  textoCarregando,
  disabled,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const estaDesabilitado = Boolean(disabled || carregando)

  return (
    <button
      type={type}
      disabled={estaDesabilitado}
      aria-busy={carregando || undefined}
      className={`inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTES[variant]} ${TAMANHOS[size]} ${className}`}
      {...rest}
    >
      {carregando && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      <span>{carregando && textoCarregando ? textoCarregando : children}</span>
    </button>
  )
}