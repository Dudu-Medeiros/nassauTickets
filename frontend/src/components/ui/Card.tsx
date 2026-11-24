import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  titulo?: string
  subtitulo?: string
  acao?: ReactNode
  children: ReactNode
}

export function Card({
  titulo,
  subtitulo,
  acao,
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm ${className}`}
      {...rest}
    >
      {(titulo || subtitulo || acao) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            {titulo && (
              <h2 className="text-lg font-semibold text-slate-100">{titulo}</h2>
            )}
            {subtitulo && (
              <p className="text-sm text-slate-400">{subtitulo}</p>
            )}
          </div>
          {acao && <div className="shrink-0">{acao}</div>}
        </header>
      )}
      {children}
    </section>
  )
}