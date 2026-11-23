import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

type Tipo = 'erro' | 'sucesso' | 'info'

const estilos: Record<Tipo, string> = {
  erro: 'border-red-400 bg-red-950 text-red-100',
  sucesso: 'border-emerald-400 bg-emerald-950 text-emerald-100',
  info: 'border-sky-400 bg-sky-950 text-sky-100',
}
const icones = { erro: AlertCircle, sucesso: CheckCircle2, info: Info }

export function Alert({ tipo = 'info', children }: { tipo?: Tipo; children: ReactNode }) {
  const Icone = icones[tipo]
  return (
    // erros são anunciados imediatamente por leitores de tela
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-lg border p-3 ${estilos[tipo]}`}>
      <Icone className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="text-sm">{children}</div>
    </div>
  )
}
