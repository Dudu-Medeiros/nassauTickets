interface SpinnerProps {
  tamanho?: 'sm' | 'md' | 'lg'
  rotulo?: string
  className?: string
}

const TAMANHOS = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
}

export function Spinner({
  tamanho = 'md',
  rotulo = 'Carregando...',
  className = '',
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`animate-spin rounded-full border-slate-600 border-t-sky-400 ${TAMANHOS[tamanho]}`}
      />
      <span className="text-sm text-slate-300">{rotulo}</span>
    </span>
  )
}