import { LogOut, Monitor, ShieldCheck, Ticket, UserCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Badge, Button } from '../ui'

interface PageShellProps {
  titulo: string
  subtitulo?: string
  children: ReactNode
  maxWidthClass?: string
}

export function PageShell({
  titulo,
  subtitulo,
  children,
  maxWidthClass = 'max-w-6xl',
}: PageShellProps) {
  const { usuario, autenticado, ehGestor, sair } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSair = () => {
    sair()
    navigate('/login', { replace: true })
  }

  const linkClass = (path: string) => {
    const ativo = location.pathname === path
    return `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
      ativo
        ? 'bg-sky-500/15 text-sky-300'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-sky-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Pular para o conteúdo principal
      </a>

      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div
          className={`mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 ${maxWidthClass}`}
        >
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-lg px-1"
            >
              <Ticket aria-hidden="true" className="h-5 w-5 text-sky-400" />
              <span>nassauTickets</span>
            </Link>

            <nav aria-label="Navegação principal" className="flex flex-wrap items-center gap-1">
              <Link to="/" className={linkClass('/')}>
                Totem
              </Link>
              <Link to="/painel" className={linkClass('/painel')}>
                <Monitor aria-hidden="true" className="h-4 w-4" />
                Painel TV
              </Link>
              {autenticado && (
                <Link to="/atendente" className={linkClass('/atendente')}>
                  <UserCheck aria-hidden="true" className="h-4 w-4" />
                  Atendente
                </Link>
              )}
              {ehGestor && (
                <Link to="/gestor" className={linkClass('/gestor')}>
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                  Gestor
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {autenticado && usuario ? (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-100 leading-tight">
                    {usuario.nome}
                  </p>
                  <Badge tone={usuario.eh_gestor ? 'violet' : 'sky'} className="mt-0.5">
                    {usuario.eh_gestor ? 'Gestor' : 'Atendente'}
                  </Badge>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSair}
                  aria-label="Sair da conta"
                >
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  Sair
                </Button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                Área do Atendente
              </Link>
            )}
          </div>
        </div>
      </header>

      <main
        id="conteudo-principal"
        tabIndex={-1}
        className={`mx-auto w-full flex-1 px-4 py-8 sm:px-6 focus:outline-none ${maxWidthClass}`}
      >
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {titulo}
          </h1>
          {subtitulo && <p className="text-sm text-slate-400">{subtitulo}</p>}
        </div>

        {children}
      </main>
    </div>
  )
}