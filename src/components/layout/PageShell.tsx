import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '../ui'
import { useAuth } from '../../hooks/useAuth'

export function PageShell({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { usuario, sair } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-amber-300 focus:px-3 focus:py-2 focus:text-slate-950"
      >
        Ir para o conteúdo
      </a>
      <header className="flex items-center justify-between gap-4 border-b border-slate-700 px-6 py-3">
        <Link to="/" className="text-lg font-semibold focus-visible:outline-3 focus-visible:outline-amber-300">
          nassauTickets
        </Link>
        {usuario && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{usuario.nome}</span>
            <Button variante="secondary" onClick={sair}>
              <LogOut className="size-4" aria-hidden="true" />
              Sair
            </Button>
          </div>
        )}
      </header>
      <main id="conteudo" className="mx-auto max-w-5xl p-6">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{titulo}</h1>
        {children}
      </main>
    </div>
  )
}
