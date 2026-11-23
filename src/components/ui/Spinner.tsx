import { Loader2 } from 'lucide-react'

export function Spinner({ rotulo = 'Carregando…' }: { rotulo?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-8 text-slate-200">
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <span>{rotulo}</span>
    </div>
  )
}
