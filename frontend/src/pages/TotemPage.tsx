import axios from 'axios'
import {
  CheckCircle2,
  Clock,
  FlaskConical,
  HeartHandshake,
  Printer,
  RefreshCw,
  RotateCcw,
  Users,
  WifiOff,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PageShell } from '../components/layout/PageShell'
import { Alert, Badge, Button, Card, Spinner } from '../components/ui'
import { extrairMensagemErro } from '../services/api'
import { emitirSenha, obterStatusExpediente } from '../services/senhaService'
import {
  ROTULOS_TIPO_SENHA,
  TIPOS_SENHA,
  type Senha,
  type StatusExpediente,
  type TipoSenha,
} from '../types'

const INTERVALO_CHECAGEM_MS = 15000
const TEMPO_RETORNO_COMPROVANTE_SEG = 15

interface OpcaoAtendimento {
  tipo: TipoSenha
  titulo: string
  descricao: string
  badgeTone: 'amber' | 'sky' | 'emerald'
  bordaHover: string
  iconeClass: string
  Icone: typeof Users
}

const OPCOES_ATENDIMENTO: OpcaoAtendimento[] = [
  {
    tipo: TIPOS_SENHA.SP,
    titulo: 'Atendimento Prioritário',
    descricao:
      'Idosos (60+), gestantes, lactantes, pessoas com deficiência ou mobilidade reduzida.',
    badgeTone: 'amber',
    bordaHover: 'hover:border-amber-400/70 focus-visible:ring-amber-300',
    iconeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Icone: HeartHandshake,
  },
  {
    tipo: TIPOS_SENHA.SE,
    titulo: 'Retirada de Exames',
    descricao:
      'Retirada rápida de resultados laboratoriais já liberados pelo sistema.',
    badgeTone: 'sky',
    bordaHover: 'hover:border-sky-400/70 focus-visible:ring-sky-300',
    iconeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    Icone: FlaskConical,
  },
  {
    tipo: TIPOS_SENHA.SG,
    titulo: 'Atendimento Geral',
    descricao:
      'Coleta de exames, agendamentos, cadastros e demais atendimentos do laboratório.',
    badgeTone: 'emerald',
    bordaHover: 'hover:border-emerald-400/70 focus-visible:ring-emerald-300',
    iconeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Icone: Users,
  },
]

function formatarDataHora(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return iso
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

function obterTomBadge(tipo: TipoSenha): 'amber' | 'sky' | 'emerald' {
  if (tipo === TIPOS_SENHA.SP) return 'amber'
  if (tipo === TIPOS_SENHA.SE) return 'sky'
  return 'emerald'
}

export default function TotemPage() {
  const [expediente, setExpediente] = useState<StatusExpediente | null>(null)
  const [carregandoStatus, setCarregandoStatus] = useState(true)
  const [apiOffline, setApiOffline] = useState(false)
  const [tipoEmitindo, setTipoEmitindo] = useState<TipoSenha | null>(null)
  const [erroEmissao, setErroEmissao] = useState<string | null>(null)
  const [senhaEmitida, setSenhaEmitida] = useState<Senha | null>(null)
  const [segundosRestantes, setSegundosRestantes] = useState(
    TEMPO_RETORNO_COMPROVANTE_SEG,
  )

  const verificarExpediente = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setCarregandoStatus(true)
    }

    try {
      const dados = await obterStatusExpediente()
      setExpediente(dados)
      setApiOffline(false)
    } catch (erro) {
      if (axios.isAxiosError(erro) && !erro.response) {
        setApiOffline(true)
      } else {
        setApiOffline(true)
      }
    } finally {
      if (!silencioso) {
        setCarregandoStatus(false)
      }
    }
  }, [])

  useEffect(() => {
    void verificarExpediente(false)
    const id = window.setInterval(() => {
      void verificarExpediente(true)
    }, INTERVALO_CHECAGEM_MS)

    return () => window.clearInterval(id)
  }, [verificarExpediente])

  useEffect(() => {
    if (!senhaEmitida) return

    setSegundosRestantes(TEMPO_RETORNO_COMPROVANTE_SEG)
    const id = window.setInterval(() => {
      setSegundosRestantes((atual) => {
        if (atual <= 1) {
          window.clearInterval(id)
          setSenhaEmitida(null)
          return 0
        }
        return atual - 1
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [senhaEmitida])

  const handleEmitir = async (tipo: TipoSenha) => {
    setErroEmissao(null)
    setTipoEmitindo(tipo)

    try {
      const novaSenha = await emitirSenha(tipo)
      setSenhaEmitida(novaSenha)
      setApiOffline(false)
    } catch (erro) {
      if (axios.isAxiosError(erro)) {
        if (!erro.response) {
          setApiOffline(true)
          setErroEmissao(
            'Não foi possível se conectar ao servidor para emitir a senha.',
          )
          return
        }

        const dadosErro = erro.response.data as {
          erro?: string
          expediente?: StatusExpediente
        }

        if (dadosErro?.expediente) {
          setExpediente(dadosErro.expediente)
        }
      }

      setErroEmissao(extrairMensagemErro(erro, 'Falha ao emitir a senha.'))
    } finally {
      setTipoEmitindo(null)
    }
  }

  const handleNovaSenha = () => {
    setSenhaEmitida(null)
    setErroEmissao(null)
    void verificarExpediente(true)
  }

  const expedienteFechado = Boolean(expediente && !expediente.aberto)
  const bloqueado =
    carregandoStatus || apiOffline || expedienteFechado || tipoEmitindo !== null

  return (
    <PageShell
      titulo="Totem de Autoatendimento"
      subtitulo="Selecione o tipo de atendimento desejado para retirar sua senha."
      maxWidthClass="max-w-5xl"
    >
      <div className="space-y-6">
        {carregandoStatus && (
          <Card>
            <div className="py-8 flex justify-center">
              <Spinner tamanho="lg" rotulo="Verificando disponibilidade do sistema..." />
            </div>
          </Card>
        )}

        {!carregandoStatus && apiOffline && (
          <Alert variant="error" titulo="Sistema temporariamente indisponível">
            <div className="space-y-3">
              <p>
                Não foi possível estabelecer comunicação com o servidor de senhas.
                Por favor, aguarde alguns instantes ou procure a recepção do
                laboratório.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void verificarExpediente(false)}
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Tentar reconectar
              </Button>
            </div>
          </Alert>
        )}

        {!carregandoStatus && !apiOffline && expediente && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <Clock aria-hidden="true" className="h-4 w-4 text-sky-400" />
              <span>
                Expediente: <strong className="text-slate-100">{expediente.expediente_inicio}</strong>{' '}
                às <strong className="text-slate-100">{expediente.expediente_fim}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {expediente.modo_demo && (
                <Badge tone="violet">Modo demonstração ativo</Badge>
              )}
              <Badge tone={expediente.aberto ? 'emerald' : 'rose'}>
                {expediente.aberto ? 'Emissão aberta' : 'Fora do expediente'}
              </Badge>
            </div>
          </div>
        )}

        {!carregandoStatus && !apiOffline && expedienteFechado && expediente && (
          <Card className="border-amber-500/40 bg-amber-950/20">
            <div className="flex flex-col items-center text-center py-6 space-y-3">
              <div className="rounded-full border border-amber-500/30 bg-amber-500/15 p-3 text-amber-300">
                <Clock aria-hidden="true" className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-semibold text-amber-100">
                Atendimento encerrado no momento
              </h2>
              <p className="max-w-lg text-sm text-amber-200/90">
                A emissão de senhas funciona das{' '}
                <strong>{expediente.expediente_inicio}</strong> às{' '}
                <strong>{expediente.expediente_fim}</strong>. Retorne dentro do
                horário de expediente para retirar sua senha.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void verificarExpediente(false)}
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Atualizar horário
              </Button>
            </div>
          </Card>
        )}

        {erroEmissao && !apiOffline && (
          <Alert variant="error" titulo="Não foi possível emitir a senha">
            {erroEmissao}
          </Alert>
        )}

        {senhaEmitida ? (
          <Card
            aria-live="polite"
            className="mx-auto max-w-xl border-emerald-500/40 bg-slate-900"
          >
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
                </span>
                <h2 className="text-xl font-bold text-white">
                  Senha emitida com sucesso
                </h2>
                <p className="text-sm text-slate-400">
                  Guarde o código abaixo e acompanhe a chamada no Painel TV.
                </p>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-6 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Badge tone={obterTomBadge(senhaEmitida.tipo)}>
                    {senhaEmitida.tipo} — {ROTULOS_TIPO_SENHA[senhaEmitida.tipo]}
                  </Badge>
                </div>

                <p
                  aria-label={`Código da senha ${senhaEmitida.codigo}`}
                  className="font-mono text-4xl sm:text-5xl font-bold tracking-wider text-white"
                >
                  {senhaEmitida.codigo}
                </p>

                <dl className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800">
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">
                      Emitida em
                    </dt>
                    <dd className="mt-0.5 text-slate-200 font-medium">
                      {formatarDataHora(senhaEmitida.emitida_em)}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-slate-500">
                      Situação
                    </dt>
                    <dd className="mt-0.5 text-emerald-300 font-medium">
                      Aguardando chamada
                    </dd>
                  </div>
                </dl>
              </div>

              <p className="text-xs text-slate-400">
                Retornando automaticamente à tela inicial em{' '}
                <strong className="text-slate-200">{segundosRestantes}s</strong>.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
                <Button
                  variant="secondary"
                  onClick={() => window.print()}
                  aria-label="Imprimir comprovante da senha"
                >
                  <Printer aria-hidden="true" className="h-4 w-4" />
                  Imprimir comprovante
                </Button>
                <Button variant="primary" onClick={handleNovaSenha}>
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Emitir nova senha
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          !carregandoStatus && (
            <section aria-label="Opções de emissão de senha">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {OPCOES_ATENDIMENTO.map((opcao) => {
                  const Icone = opcao.Icone
                  const emitindoEste = tipoEmitindo === opcao.tipo

                  return (
                    <button
                      key={opcao.tipo}
                      type="button"
                      disabled={bloqueado}
                      aria-busy={emitindoEste || undefined}
                      aria-label={`Emitir senha ${opcao.tipo} - ${opcao.titulo}`}
                      onClick={() => void handleEmitir(opcao.tipo)}
                      className={`group flex flex-col justify-between text-left rounded-2xl border border-slate-800 bg-slate-900/90 p-6 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-45 disabled:cursor-not-allowed ${opcao.bordaHover}`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${opcao.iconeClass}`}
                          >
                            <Icone aria-hidden="true" className="h-6 w-6" />
                          </span>
                          <Badge tone={opcao.badgeTone}>{opcao.tipo}</Badge>
                        </div>

                        <div className="space-y-1.5">
                          <h2 className="text-lg font-semibold text-white">
                            {opcao.titulo}
                          </h2>
                          <p className="text-sm text-slate-400 leading-relaxed">
                            {opcao.descricao}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-sm font-semibold text-slate-200 group-hover:text-white">
                        <span>
                          {emitindoEste
                            ? 'Emitindo senha...'
                            : apiOffline
                              ? 'Indisponível'
                              : expedienteFechado
                                ? 'Fora do expediente'
                                : 'Retirar senha'}
                        </span>
                        {apiOffline ? (
                          <WifiOff aria-hidden="true" className="h-4 w-4 text-rose-400" />
                        ) : emitindoEste ? (
                          <span
                            aria-hidden="true"
                            className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"
                          />
                        ) : (
                          <span aria-hidden="true" className="text-sky-400">
                            →
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        )}
      </div>
    </PageShell>
  )
}