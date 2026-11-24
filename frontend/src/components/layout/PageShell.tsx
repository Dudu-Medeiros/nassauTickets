import {
  LogIn,
  LogOut,
  Menu,
  Monitor,
  ShieldCheck,
  Ticket,
  UserCheck,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
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
  const [menuAberto, setMenuAberto] = useState(false)

  const handleSair = () => {
    setMenuAberto(false)
    sair()
    navigate('/login', { replace: true })
  }

  const fecharMenu = () => setMenuAberto(false)

  const linkClass = (path: string, mobile = false) => {
    const ativo = location.pathname === path
    const base = mobile
      ? 'flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
      : 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'

    return `${base} ${
      ativo
        ? 'bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/25'
        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
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

      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-900/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6 min-w-0">
            <Link
              to="/"
              onClick={fecharMenu}
              className="group flex items-center gap-2 text-lg font-bold tracking-tight text-white rounded-lg px-1 py-0.5 transition-colors hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 shrink-0"
            >
              <Ticket
                aria-hidden="true"
                className="h-5 w-5 text-sky-400 transition-transform duration-200 group-hover:-rotate-6"
              />
              <span>nassauTickets</span>
            </Link>

            <nav
              aria-label="Navegação principal"
              className="hidden md:flex items-center gap-1"
            >
              <Link to="/" className={linkClass('/')}>
                Totem
              </Link>
              <Link to="/painel" className={linkClass('/painel')}>
                <Monitor aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>Painel TV</span>
              </Link>
              {autenticado && (
                <Link to="/atendente" className={linkClass('/atendente')}>
                  <UserCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>Atendente</span>
                </Link>
              )}
              {ehGestor && (
                <Link to="/gestor" className={linkClass('/gestor')}>
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>Gestor</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            {autenticado && usuario ? (
              <>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-100 leading-tight">
                    {usuario.nome}
                  </p>
                  <Badge
                    tone={usuario.eh_gestor ? 'violet' : 'sky'}
                    className="mt-0.5"
                  >
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
                  <span>Sair</span>
                </Button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-slate-800/90 border border-slate-700 px-3.5 py-1.5 text-sm font-medium text-slate-100 transition-all duration-200 hover:bg-slate-700 hover:border-slate-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <LogIn aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>Login Superior</span>
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuAberto((atual) => !atual)}
            aria-expanded={menuAberto}
            aria-controls="menu-navegacao-mobile"
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu de navegação'}
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 transition-all duration-200 hover:bg-slate-700 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
          >
            {menuAberto ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Menu aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>

        {menuAberto && (
          <div
            id="menu-navegacao-mobile"
            className="md:hidden border-t border-slate-800 bg-slate-900/95 px-4 py-4 space-y-3 animate-fade-in"
          >
            <nav aria-label="Navegação mobile" className="space-y-1">
              <Link to="/" onClick={fecharMenu} className={linkClass('/', true)}>
                <Ticket aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>Totem</span>
              </Link>
              <Link
                to="/painel"
                onClick={fecharMenu}
                className={linkClass('/painel', true)}
              >
                <Monitor aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>Painel TV</span>
              </Link>
              {autenticado && (
                <Link
                  to="/atendente"
                  onClick={fecharMenu}
                  className={linkClass('/atendente', true)}
                >
                  <UserCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>Atendente</span>
                </Link>
              )}
              {ehGestor && (
                <Link
                  to="/gestor"
                  onClick={fecharMenu}
                  className={linkClass('/gestor', true)}
                >
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>Gestor</span>
                </Link>
              )}
            </nav>

            <div className="border-t border-slate-800 pt-3">
              {autenticado && usuario ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">
                      {usuario.nome}
                    </p>
                    <Badge
                      tone={usuario.eh_gestor ? 'violet' : 'sky'}
                      className="mt-1"
                    >
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
                    <span>Sair</span>
                  </Button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={fecharMenu}
                  className="flex w-full min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <LogIn aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>Área do Atendente</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main
        id="conteudo-principal"
        tabIndex={-1}
        className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 focus:outline-none animate-slide-up ${maxWidthClass}`}
      >
        <div className="mb-6 space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="text-sm sm:text-[15px] text-slate-400 leading-relaxed">
              {subtitulo}
            </p>
          )}
        </div>

        {children}
      </main>
    </div>
  )
}