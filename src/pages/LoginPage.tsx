import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Input } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { mensagemDeErro } from '../services/api'

export default function LoginPage() {
  const { entrar, autenticado, usuario } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const destinoPadrao = usuario?.eh_gestor ? '/gestor' : '/atendente'
  if (autenticado) return <Navigate to={destinoPadrao} replace />

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const u = await entrar({ email, senha })
      const de = (location.state as { de?: string } | null)?.de
      navigate(de ?? (u.eh_gestor ? '/gestor' : '/atendente'), { replace: true })
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <Card className="w-full max-w-md">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Entrar</h1>
        <form onSubmit={aoEnviar} className="flex flex-col gap-4" noValidate>
          {erro && <Alert tipo="erro">{erro}</Alert>}
          <Input label="E-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          <Button type="submit" tamanho="lg" carregando={enviando}>
            Entrar
          </Button>
        </form>
      </Card>
    </main>
  )
}
