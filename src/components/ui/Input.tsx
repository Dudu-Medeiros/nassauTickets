import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  erro?: string
  ajuda?: string
}

export function Input({ label, erro, ajuda, className = '', id, ...rest }: InputProps) {
  const gerado = useId()
  const inputId = id ?? gerado
  const ajudaId = `${inputId}-ajuda`
  const erroId = `${inputId}-erro`
  const descricao = [ajuda ? ajudaId : null, erro ? erroId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao || undefined}
        className={`min-h-11 rounded-lg border bg-slate-900 px-3 text-base text-slate-100 placeholder:text-slate-400
          focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-300
          ${erro ? 'border-red-400' : 'border-slate-600'} ${className}`}
        {...rest}
      />
      {ajuda && (
        <p id={ajudaId} className="text-sm text-slate-300">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={erroId} className="text-sm text-red-300">
          {erro}
        </p>
      )}
    </div>
  )
}
