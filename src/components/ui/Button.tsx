import type { ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type Variante = 'primary' | 'secondary' | 'danger' | 'ghost'
type Tamanho = 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamanho?: Tamanho
  carregando?: boolean
}

const variantes: Record<Variante, string> = {
  primary: 'bg-sky-400 text-slate-950 hover:bg-sky-300',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-600',
  danger: 'bg-red-500 text-white hover:bg-red-400',
  ghost: 'bg-transparent text-slate-100 hover:bg-slate-800',
}

const tamanhos: Record<Tamanho, string> = {
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-14 px-6 text-lg',
  xl: 'min-h-20 px-8 text-2xl', // alvos grandes para o totem
}

export function Button({
  variante = 'primary',
  tamanho = 'md',
  carregando = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors
        focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-300
        disabled:cursor-not-allowed disabled:opacity-50 ${variantes[variante]} ${tamanhos[tamanho]} ${className}`}
      {...rest}
    >
      {carregando && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
