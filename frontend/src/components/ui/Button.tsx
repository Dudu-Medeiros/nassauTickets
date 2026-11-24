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
    'bg-sky-500 text-slate-950 border border-sky-400/40 shadow-sm shadow-sky-500/15 hover:bg-sky-400 hover:shadow-md hover:shadow-sky-500/25 focus-visible:ring-sky-300 font-semibold',
  secondary:
    'bg-slate-800/90 text-slate-100 border border-slate-700 hover:bg-slate-700/90 hover:border-slate-600 focus-visible:ring-slate-400 font-medium',
  danger:
    'bg-rose-600 text-white border border-rose-500/40 shadow-sm shadow-rose-600/20 hover:bg-rose-500 hover:shadow-md hover:shadow-rose-500/25 focus-visible:ring-rose-300 font-semibold',
  success:
    'bg-emerald-500 text-slate-950 border border-emerald-400/40 shadow-sm shadow-emerald-500/15 hover:bg-emerald-400 hover:shadow-md hover:shadow-emerald-500/25 focus-visible:ring-emerald-300 font-semibold',
  ghost:
    'bg-transparent text-slate-300 border border-transparent hover:bg-slate-800/80 hover:text-white focus-visible:ring-slate-400 font-medium',
}

const TAMANHOS: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'min-h-10 px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'min-h-12 px-5 py-3 text-base rounded-xl gap-2.5',
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
      className={`inline-flex items-center justify-center whitespace-nowrap select-none leading-none transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:shrink-0 ${VARIANTES[variant]} ${TAMANHOS[size]} ${className}`}
      {...rest}
    >
      {carregando && (
        <span
          aria-hidden="true"
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {carregando && textoCarregando ? (
        <span>{textoCarregando}</span>
      ) : (
        children
      )}
    </button>
  )
}