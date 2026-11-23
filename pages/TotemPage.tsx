import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Accessibility, CheckCircle2, Clock, FlaskConical, Users, WifiOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Alert, Button, Card } from '../components/ui'
import { mensagemDeErro } from '../services/api'
import { emitirSenha, obterExpediente } from '../services/senhaService'
import { ROTULOS_TIPO_SENHA } from '../types'
import type { ErroApi, Senha, StatusExpediente, TipoSenha } from '../types'

const INTERVALO_EXPEDIENTE_MS = 30_000
const TEMPO_COMPROVANTE_S = 15

const OPCOES: { tipo: TipoSenha; descricao: string; Icone: LucideIcon }[] = [
  { tipo: 'SP', descricao: 'Idosos, gestantes, pessoas com deficiência', Icone: Accessibility },
  { tipo: 'SE', descricao: 'Entrega e retirada de exames', Icone: FlaskConical },
  { tipo: 'SG', descricao: 'Atendimento geral', Icone: Users },
]

type Conexao = 'verificando' | 'online' | 'offline'

export default function TotemPage() {
  const [expediente, setExpediente] = useState<StatusExpediente | null>(null)
  const [conexao, setConexao] = useState<Conexao>('verificando')
  const [emitindo, setEmitindo] = useState<TipoSenha | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [comprovante, setComprovante] = useState<Senha | null>(null)
  const [restante, setRestante] = useState(TEMPO_COMPROVANTE_S)
  const tituloRef = useRef<HTMLHeadingElement>(null)

  const verificar = useCallback(async () => {
    try {
      setExpediente(await obterExpediente())
      setConexao('online')
    } catch {
      setConexao('offline')
    }
  }, [])

  // Consulta o expediente ao abrir e periodicamente (detecta API fora do ar e virada de horário).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void verificar()
    const id = setInterval(verificar, INTERVALO_EXPEDIENTE_MS)
    return () => clearInterval(id)
  }, [verificar])

  // Comprovante: contagem regressiva e retorno automático à tela inicial.
  useEffect(() => {
    if (!comprovante) return
    const id = setInterval(() => {
      setRestante((s) => {
        if (s <= 1) {
          setComprovante(null)
          return TEMPO_COMPROVANTE_S
        }
        return s - 1
      })
    }, 1000)
    tituloRef.current?.focus()
    return () => clearInterval(id)
  }, [comprovante])

  async function aoEscolher(tipo: TipoSenha) {
    setErro(null)
    setEmitindo(tipo)
    try {
      const nova = await emitirSenha(tipo)
      setRestante(TEMPO_COMPROVANTE_S)
      setComprovante(nova)
      setConexao('online')
    } catch (e) {
      if (axios.isAxiosError<ErroApi>(e) && !e.response) {
        setConexao('offline')
      } else {
        if (axios.isAxiosError<ErroApi>(e) && e.response?.status === 403) void verificar()
        setErro(mensagemDeErro(e))
      }
    } finally {
      setEmitindo(null)
    }
  }

  const fechado = expediente !== null && !expediente.aberto

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 p-6 text-slate-100">
      {comprovante ? (
        <Card className="w-full max-w-lg text-center" role="region" aria-label="Comprovante da senha">
          <CheckCircle2 className="mx-auto size-12 text-emerald-400" aria-hidden="true" />
          <h1 ref={tituloRef} tabIndex={-1} className="mt-3 text-xl font-semibold outline-none">
            Retire sua senha
          </h1>
          <p className="mt-1 text-slate-300">{ROTULOS_TIPO_SENHA[comprovante.tipo]}</p>
          <p className="my-6 font-mono text-5xl font-bold tracking-wider" aria-label={`Código da senha ${comprovante.codigo}`}>
            {comprovante.codigo}
          </p>
          <p className="text-sm text-slate-300">
            Emitida às{' '}
            {comprovante.emitida_em
              ? new Date(comprovante.emitida_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '--:--'}
            . Aguarde ser chamado no painel.
          </p>
          <Button className="mt-6 w-full" tamanho="lg" onClick={() => setComprovante(null)}>
            Concluir ({restante}s)
          </Button>
        </Card>
      ) : (
        <>
          <header className="text-center">
            <h1 className="text-4xl font-bold tracking-tight">Bem-vindo</h1>
            <p className="mt-2 text-xl text-slate-300">Toque na opção desejada para retirar sua senha</p>
          </header>

          {conexao === 'offline' && (
            <div className="w-full max-w-3xl">
              <Alert tipo="erro">
                <span className="inline-flex items-center gap-2 font-medium">
                  <WifiOff className="size-4" aria-hidden="true" />
                  Sistema indisponível no momento.
                </span>{' '}
                Procure a recepção. Tentando reconectar automaticamente…
              </Alert>
            </div>
          )}

          {fechado && expediente && (
            <div className="w-full max-w-3xl">
              <Alert tipo="info">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Clock className="size-4" aria-hidden="true" />
                  Estamos fora do horário de atendimento.
                </span>{' '}
                Funcionamos das {expediente.expediente_inicio} às {expediente.expediente_fim}. Volte nesse horário.
              </Alert>
            </div>
          )}

          {erro && (
            <div className="w-full max-w-3xl">
              <Alert tipo="erro">{erro}</Alert>
            </div>
          )}

          <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
            {OPCOES.map(({ tipo, descricao, Icone }) => (
              <Button
                key={tipo}
                variante={tipo === 'SP' ? 'primary' : 'secondary'}
                tamanho="xl"
                className="h-full flex-col gap-2 py-6"
                disabled={fechado || conexao !== 'online' || emitindo !== null}
                carregando={emitindo === tipo}
                onClick={() => aoEscolher(tipo)}
              >
                <Icone className="size-10" aria-hidden="true" />
                <span>{ROTULOS_TIPO_SENHA[tipo]}</span>
                <span className="text-sm font-normal">{descricao}</span>
              </Button>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
