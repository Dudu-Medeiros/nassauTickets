import { useId, type InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  erro?: string | null
  ajuda?: string
}

export function Input({
  label,
  erro,
  ajuda,
  id,
  className = '',
  required,
  ...rest
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const erroId = `${inputId}-erro`
  const ajudaId = `${inputId}-ajuda`

  const describedBy = [erro ? erroId : null, ajuda ? ajudaId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-200"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-rose-400 ml-1">
            *
          </span>
        )}
      </label>

      <input
        id={inputId}
        required={required}
        aria-invalid={erro ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`w-full rounded-xl border bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:border-sky-400 disabled:opacity-50 ${
          erro ? 'border-rose-500' : 'border-slate-700 hover:border-slate-600'
        } ${className}`}
        {...rest}
      />

      {ajuda && !erro && (
        <p id={ajudaId} className="text-xs text-slate-400">
          {ajuda}
        </p>
      )}

      {erro && (
        <p id={erroId} role="alert" className="text-xs text-rose-400">
          {erro}
        </p>
      )}
    </div>
  )
}