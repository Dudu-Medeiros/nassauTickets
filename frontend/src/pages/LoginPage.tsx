import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { Alert, Button, Card, Input, Spinner } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { extrairMensagemErro } from '../services/api'

interface LocationState {
  from?: {
    pathname: string
  }
}

export default function LoginPage() {
  const { autenticado, carregando, ehGestor, entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const state = location.state as LocationState | null
  const rotaOrigem = state?.from?.pathname

  const resolverDestino = (usuarioEhGestor: boolean): string => {
    if (rotaOrigem && rotaOrigem !== '/login') {
      if (rotaOrigem.startsWith('/gestor') && !usuarioEhGestor) {
        return '/atendente'
      }
      return rotaOrigem
    }
    return usuarioEhGestor ? '/gestor' : '/atendente'
  }

  if (carregando) {
    return (
      <PageShell
        titulo="Acesso Restrito"
        subtitulo="Verificando sessão atual..."
        maxWidthClass="max-w-md"
      >
        <Card>
          <div className="py-8 flex justify-center">
            <Spinner tamanho="md" rotulo="Carregando sessão..." />
          </div>
        </Card>
      </PageShell>
    )
  }

  if (autenticado) {
    return <Navigate to={resolverDestino(ehGestor)} replace />
  }

  const handleSubmit = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setErro(null)

    const emailLimpo = email.trim().toLowerCase()
    if (!emailLimpo || !senha) {
      setErro('Informe seu e-mail e senha para entrar.')
      return
    }

    setEnviando(true)
    try {
      const usuarioLogado = await entrar({ email: emailLimpo, senha })
      navigate(resolverDestino(usuarioLogado.eh_gestor), { replace: true })
    } catch (falha) {
      setErro(
        extrairMensagemErro(
          falha,
          'Não foi possível realizar o login. Verifique suas credenciais.',
        ),
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <PageShell
      titulo="Acesso Restrito"
      subtitulo="Autenticação exclusiva para Atendentes (AA) e Gestor."
      maxWidthClass="max-w-md"
    >
      <Card
        titulo="Entrar no sistema"
        subtitulo="Informe suas credenciais institucionais para acessar o terminal."
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
          {erro && (
            <Alert variant="error" titulo="Falha na autenticação">
              {erro}
            </Alert>
          )}

          <Input
            label="E-mail"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="atendente@nassautickets.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={enviando}
            required
          />

          <div className="space-y-1.5">
            <div className="relative">
              <Input
                label="Senha"
                type={mostrarSenha ? 'text' : 'password'}
                name="senha"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={enviando}
                className="pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((atual) => !atual)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2.5 top-[33px] rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
              >
                {mostrarSenha ? (
                  <EyeOff aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Eye aria-hidden="true" className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            carregando={enviando}
            textoCarregando="Entrando..."
            className="w-full"
          >
            <LogIn aria-hidden="true" className="h-4 w-4" />
            Entrar
          </Button>
        </form>
      </Card>
    </PageShell>
  )
}