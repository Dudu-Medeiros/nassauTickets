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
      className={`rounded-2xl border border-slate-800/90 bg-slate-900/90 p-4 sm:p-6 shadow-sm transition-colors duration-200 ${className}`}
      {...rest}
    >
      {(titulo || subtitulo || acao) && (
        <header className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0">
            {titulo && (
              <h2 className="text-base sm:text-lg font-semibold text-slate-100 leading-snug">
                {titulo}
              </h2>
            )}
            {subtitulo && (
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {subtitulo}
              </p>
            )}
          </div>
          {acao && <div className="shrink-0 flex flex-wrap items-center gap-2">{acao}</div>}
        </header>
      )}
      {children}
    </section>
  )
}