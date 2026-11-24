import {
  ArrowLeftRight,
  Bell,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  Megaphone,
  Monitor,
  Play,
  RefreshCw,
  UserX,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PageShell } from '../components/layout/PageShell'
import { Alert, Badge, Button, Card, Spinner } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { extrairMensagemErro } from '../services/api'
import {
  chamarProximaSenha,
  executarAcaoSenha,
  listarGuichesAtivos,
  obterResumoAtendimento,
  type AcaoAtendimento,
} from '../services/atendimentoService'
import {
  ROTULOS_STATUS_SENHA,
  ROTULOS_TIPO_SENHA,
  STATUS_SENHA,
  TIPOS_SENHA,
  type Guiche,
  type ResumoAtendimento,
  type StatusSenha,
  type TipoSenha,
} from '../types'

const CHAVE_GUICHE_STORAGE = 'nassautickets:guiche_selecionado'
const INTERVALO_POLLING_MS = 5000

function lerGuicheSalvo(): number | null {
  try {
    const bruto = localStorage.getItem(CHAVE_GUICHE_STORAGE)
    if (!bruto) return null
    const parsed = Number(bruto)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  } catch {
    return null
  }
}

function salvarGuicheSelecionado(guicheId: number): void {
  try {
    localStorage.setItem(CHAVE_GUICHE_STORAGE, String(guicheId))
  } catch {
    // storage indisponivel no navegador
  }
}

function formatarDuracao(segundosTotais: number): string {
  const s = Math.max(0, Math.floor(segundosTotais))
  const horas = Math.floor(s / 3600)
  const minutos = Math.floor((s % 3600) / 60)
  const segundos = s % 60

  const mm = String(minutos).padStart(2, '0')
  const ss = String(segundos).padStart(2, '0')

  if (horas > 0) {
    return `${String(horas).padStart(2, '0')}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}

function formatarHora(iso: string | null): string {
  if (!iso) return '--:--:--'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '--:--:--'
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function calcularSegundosDecorridos(iso: string | null, agoraMs: number): number {
  if (!iso) return 0
  const inicioMs = new Date(iso).getTime()
  if (Number.isNaN(inicioMs)) return 0
  return Math.max(0, Math.floor((agoraMs - inicioMs) / 1000))
}

function tomPrioridade(tipo: TipoSenha): 'amber' | 'sky' | 'emerald' {
  if (tipo === TIPOS_SENHA.SP) return 'amber'
  if (tipo === TIPOS_SENHA.SE) return 'sky'
  return 'emerald'
}

function tomStatus(status: StatusSenha): 'sky' | 'amber' | 'emerald' | 'rose' | 'neutral' {
  switch (status) {
    case STATUS_SENHA.CHAMADA:
      return 'sky'
    case STATUS_SENHA.CHAMADA_NOVAMENTE:
      return 'amber'
    case STATUS_SENHA.EM_ATENDIMENTO:
      return 'emerald'
    case STATUS_SENHA.NAO_COMPARECEU:
      return 'rose'
    default:
      return 'neutral'
  }
}

interface FeedbackOperacao {
  variant: 'success' | 'info' | 'warning' | 'error'
  titulo: string
  mensagem: string
}

export default function AtendentePage() {
  const { usuario } = useAuth()

  const [guiches, setGuiches] = useState<Guiche[]>([])
  const [guicheId, setGuicheId] = useState<number | null>(() => lerGuicheSalvo())
  const [trocandoGuiche, setTrocandoGuiche] = useState<boolean>(false)
  const [resumo, setResumo] = useState<ResumoAtendimento | null>(null)
  const [carregandoInicial, setCarregandoInicial] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [acaoEmCurso, setAcaoEmCurso] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackOperacao | null>(null)
  const [agoraMs, setAgoraMs] = useState<number>(() => Date.now())

  const abandonoSyncDisparadoRef = useRef<number | null>(null)

  const sincronizarDados = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setAtualizando(true)
    }

    try {
      const [listaGuiches, dadosResumo] = await Promise.all([
        listarGuichesAtivos(),
        obterResumoAtendimento(),
      ])

      setGuiches(listaGuiches)
      setResumo(dadosResumo)

      if (dadosResumo.senha_atual?.guiche_id) {
        setGuicheId(dadosResumo.senha_atual.guiche_id)
        salvarGuicheSelecionado(dadosResumo.senha_atual.guiche_id)
        setTrocandoGuiche(false)
      } else {
        setGuicheId((atual) => {
          const existe = listaGuiches.some((g) => g.id === atual)
          if (existe && atual !== null) return atual
          const primeiro = listaGuiches[0]?.id ?? null
          if (primeiro !== null) salvarGuicheSelecionado(primeiro)
          return primeiro
        })
      }

      if (dadosResumo.rotinas_executadas.total_abandonos_automaticos > 0) {
        const codigos =
          dadosResumo.rotinas_executadas.abandonos_automaticos.join(', ')
        setFeedback({
          variant: 'warning',
          titulo: 'Abandono automático registrado',
          mensagem: `A senha ${codigos} foi marcada automaticamente como NÃO_COMPARECEU após o tempo limite da 2ª chamada.`,
        })
      }
    } catch (erro) {
      if (!silencioso) {
        setFeedback({
          variant: 'error',
          titulo: 'Falha ao sincronizar terminal',
          mensagem: extrairMensagemErro(
            erro,
            'Não foi possível carregar os dados do atendimento.',
          ),
        })
      }
    } finally {
      setCarregandoInicial(false)
      if (!silencioso) {
        setAtualizando(false)
      }
    }
  }, [])

  useEffect(() => {
    void sincronizarDados(false)
  }, [sincronizarDados])

  useEffect(() => {
    const id = window.setInterval(() => {
      void sincronizarDados(true)
    }, INTERVALO_POLLING_MS)

    return () => window.clearInterval(id)
  }, [sincronizarDados])

  const senhaAtual = resumo?.senha_atual ?? null
  const emAtendimento = senhaAtual?.status === STATUS_SENHA.EM_ATENDIMENTO
  const emSegundaChamada = senhaAtual?.status === STATUS_SENHA.CHAMADA_NOVAMENTE

  useEffect(() => {
    if (!emAtendimento && !emSegundaChamada) {
      abandonoSyncDisparadoRef.current = null
      return
    }

    setAgoraMs(Date.now())
    const id = window.setInterval(() => {
      setAgoraMs(Date.now())
    }, 1000)

    return () => window.clearInterval(id)
  }, [emAtendimento, emSegundaChamada, senhaAtual?.id])

  const limiteAbandono = resumo?.tempo_limite_abandono_segundos ?? 120
  const segundosEmAtendimento = emAtendimento
    ? calcularSegundosDecorridos(senhaAtual?.inicio_atendimento_em ?? null, agoraMs)
    : 0

  const segundosDesdeSegundaChamada = emSegundaChamada
    ? calcularSegundosDecorridos(senhaAtual?.segunda_chamada_em ?? null, agoraMs)
    : 0

  const segundosAteAbandono = Math.max(
    0,
    limiteAbandono - segundosDesdeSegundaChamada,
  )

  useEffect(() => {
    if (
      emSegundaChamada &&
      senhaAtual &&
      segundosAteAbandono === 0 &&
      abandonoSyncDisparadoRef.current !== senhaAtual.id
    ) {
      abandonoSyncDisparadoRef.current = senhaAtual.id
      void sincronizarDados(true)
    }
  }, [emSegundaChamada, senhaAtual, segundosAteAbandono, sincronizarDados])

  const handleSelecionarGuiche = (id: number) => {
    if (senhaAtual !== null) return
    setGuicheId(id)
    salvarGuicheSelecionado(id)
    setTrocandoGuiche(false)
  }

  const handleChamarProximo = async () => {
    if (!guicheId) {
      setFeedback({
        variant: 'warning',
        titulo: 'Selecione um guichê',
        mensagem: 'Escolha um guichê ativo antes de chamar a próxima senha.',
      })
      return
    }

    setFeedback(null)
    setAcaoEmCurso('chamar')
    setTrocandoGuiche(false)

    try {
      const chamada = await chamarProximaSenha(guicheId)
      setFeedback({
        variant: 'info',
        titulo: 'Senha chamada',
        mensagem: `Senha ${chamada.codigo} (${ROTULOS_TIPO_SENHA[chamada.tipo]}) direcionada ao ${chamada.guiche_nome ?? `Guichê ${guicheId}`}.`,
      })
      await sincronizarDados(true)
    } catch (erro) {
      setFeedback({
        variant: 'error',
        titulo: 'Não foi possível chamar a próxima senha',
        mensagem: extrairMensagemErro(erro),
      })
    } finally {
      setAcaoEmCurso(null)
    }
  }

  const handleAcaoSenha = async (acao: AcaoAtendimento) => {
    if (!senhaAtual) return

    setFeedback(null)
    setAcaoEmCurso(acao)

    try {
      const atualizada = await executarAcaoSenha(senhaAtual.id, acao)

      if (acao === 'rechamar') {
        setFeedback({
          variant: 'warning',
          titulo: '2ª chamada realizada',
          mensagem: `Senha ${atualizada.codigo} anunciada novamente como última chamada.`,
        })
      } else if (acao === 'iniciar') {
        setFeedback({
          variant: 'info',
          titulo: 'Atendimento iniciado',
          mensagem: `Cronômetro iniciado para a senha ${atualizada.codigo}.`,
        })
      } else if (acao === 'finalizar') {
        const tempoTexto = formatarDuracao(
          atualizada.tempo_atendimento_segundos ?? 0,
        )
        setFeedback({
          variant: 'success',
          titulo: 'Atendimento finalizado',
          mensagem: `Senha ${atualizada.codigo} concluída em ${tempoTexto}. Guichê liberado.`,
        })
      } else if (acao === 'nao-compareceu') {
        setFeedback({
          variant: 'warning',
          titulo: 'Ausência registrada',
          mensagem: `Senha ${atualizada.codigo} marcada como NÃO_COMPARECEU. Guichê liberado.`,
        })
      }

      await sincronizarDados(true)
    } catch (erro) {
      setFeedback({
        variant: 'error',
        titulo: 'Não foi possível concluir a ação',
        mensagem: extrairMensagemErro(erro),
      })
      await sincronizarDados(true)
    } finally {
      setAcaoEmCurso(null)
    }
  }

  const fila = resumo?.fila_aguardando ?? { SP: 0, SE: 0, SG: 0, total: 0 }
  const expedienteFechado = Boolean(resumo && !resumo.expediente.aberto)
  const guicheAtual = guiches.find((g) => g.id === guicheId) ?? null
  const operacaoOcupada = acaoEmCurso !== null
  const exibirSeletorGuiche =
    guiches.length > 0 && senhaAtual === null && (!guicheAtual || trocandoGuiche)

  return (
    <PageShell
      titulo="Terminal do Atendente"
      subtitulo={`Operador: ${usuario?.nome ?? 'Atendente'} — controle de guichê e atendimento em tempo real.`}
    >
      {carregandoInicial ? (
        <Card>
          <div className="py-12 flex justify-center">
            <Spinner tamanho="lg" rotulo="Carregando terminal do atendente..." />
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {expedienteFechado && resumo && (
            <Alert variant="warning" titulo="Expediente encerrado">
              O horário de expediente ({resumo.expediente.expediente_inicio} às{' '}
              {resumo.expediente.expediente_fim}) foi encerrado. Novas chamadas
              estão bloqueadas, mas atendimentos já em curso podem ser
              finalizados normalmente.
            </Alert>
          )}

          {feedback && (
            <Alert variant={feedback.variant} titulo={feedback.titulo}>
              {feedback.mensagem}
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            <div className="lg:col-span-8 space-y-5 sm:space-y-6">
              <Card className="p-4 sm:p-5">
                {guiches.length === 0 ? (
                  <Alert variant="warning" titulo="Nenhum guichê ativo">
                    Solicite ao Gestor o cadastro ou ativação de um guichê para
                    iniciar os atendimentos.
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/15 text-sky-300">
                          <Monitor aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wider text-slate-400">
                            Posto de trabalho ativo
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <p className="text-base font-semibold text-white truncate">
                              {guicheAtual
                                ? guicheAtual.nome
                                : 'Nenhum guichê selecionado'}
                            </p>
                            {senhaAtual ? (
                              <Badge tone="amber">
                                <Lock aria-hidden="true" className="h-3 w-3" />
                                <span>Bloqueado durante atendimento</span>
                              </Badge>
                            ) : (
                              <Badge tone="emerald">Livre</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {guicheAtual && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 sm:flex-initial"
                            disabled={senhaAtual !== null || operacaoOcupada}
                            onClick={() => setTrocandoGuiche((atual) => !atual)}
                          >
                            <ArrowLeftRight aria-hidden="true" className="h-4 w-4" />
                            <span>
                              {trocandoGuiche ? 'Fechar seleção' : 'Trocar guichê'}
                            </span>
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 sm:flex-initial"
                          carregando={atualizando}
                          textoCarregando="Atualizando..."
                          onClick={() => void sincronizarDados(false)}
                        >
                          <RefreshCw aria-hidden="true" className="h-4 w-4" />
                          <span>Atualizar</span>
                        </Button>
                      </div>
                    </div>

                    {exibirSeletorGuiche && (
                      <div className="border-t border-slate-800 pt-4 space-y-2.5 animate-fade-in">
                        <p className="text-xs text-slate-400">
                          Selecione em qual guichê físico você vai operar:
                        </p>
                        <div
                          role="radiogroup"
                          aria-label="Guichês disponíveis"
                          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5"
                        >
                          {guiches.map((guiche) => {
                            const selecionado = guiche.id === guicheId
                            return (
                              <button
                                key={guiche.id}
                                type="button"
                                role="radio"
                                aria-checked={selecionado}
                                disabled={operacaoOcupada}
                                onClick={() => handleSelecionarGuiche(guiche.id)}
                                className={`rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed ${
                                  selecionado
                                    ? 'border-sky-400 bg-sky-500/15 text-white shadow-sm shadow-sky-500/10'
                                    : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:bg-slate-900 hover:text-white'
                                }`}
                              >
                                <p className="text-[11px] uppercase tracking-wider text-slate-400 tabular-nums">
                                  Nº {String(guiche.numero).padStart(2, '0')}
                                </p>
                                <p className="mt-0.5 text-sm font-semibold truncate">
                                  {guiche.nome}
                                </p>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              <Card
                titulo="Atendimento Atual"
                subtitulo={
                  guicheAtual
                    ? `Operando no ${guicheAtual.nome} — um atendimento ativo por vez`
                    : 'Selecione um guichê para iniciar'
                }
              >
                {senhaAtual ? (
                  <div className="space-y-5 sm:space-y-6 animate-pop-in">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6 space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={tomPrioridade(senhaAtual.tipo)}>
                            {senhaAtual.tipo} — {ROTULOS_TIPO_SENHA[senhaAtual.tipo]}
                          </Badge>
                          <Badge tone={tomStatus(senhaAtual.status)}>
                            {ROTULOS_STATUS_SENHA[senhaAtual.status]}
                          </Badge>
                        </div>

                        <span className="text-sm font-semibold text-sky-300">
                          {senhaAtual.guiche_nome ?? guicheAtual?.nome}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wider text-slate-500">
                            Código da senha
                          </p>
                          <p className="mt-1 tabular-nums text-3xl sm:text-5xl font-extrabold tracking-tight text-white break-all">
                            {senhaAtual.codigo}
                          </p>
                        </div>

                        {emAtendimento && (
                          <div
                            aria-live="off"
                            className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-5 py-3 text-center sm:text-right shrink-0"
                          >
                            <p className="text-xs font-medium uppercase tracking-wider text-emerald-300 flex items-center justify-center sm:justify-end gap-1.5">
                              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                              Tempo de atendimento
                            </p>
                            <p
                              aria-label={`Tempo decorrido ${formatarDuracao(segundosEmAtendimento)}`}
                              className="mt-1 tabular-nums text-3xl sm:text-4xl font-bold text-emerald-200"
                            >
                              {formatarDuracao(segundosEmAtendimento)}
                            </p>
                          </div>
                        )}

                        {emSegundaChamada && (
                          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 px-5 py-3 text-center sm:text-right shrink-0">
                            <p className="text-xs font-medium uppercase tracking-wider text-amber-300 flex items-center justify-center sm:justify-end gap-1.5">
                              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                              Abandono automático em
                            </p>
                            <p className="mt-1 tabular-nums text-3xl font-bold text-amber-200">
                              {formatarDuracao(segundosAteAbandono)}
                            </p>
                          </div>
                        )}
                      </div>

                      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-800 pt-4 text-xs">
                        <div>
                          <dt className="text-slate-500">Emitida</dt>
                          <dd className="mt-0.5 tabular-nums font-medium text-slate-200">
                            {formatarHora(senhaAtual.emitida_em)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">1ª chamada</dt>
                          <dd className="mt-0.5 tabular-nums font-medium text-slate-200">
                            {formatarHora(senhaAtual.primeira_chamada_em)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">2ª chamada</dt>
                          <dd className="mt-0.5 tabular-nums font-medium text-slate-200">
                            {formatarHora(senhaAtual.segunda_chamada_em)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Início</dt>
                          <dd className="mt-0.5 tabular-nums font-medium text-slate-200">
                            {formatarHora(senhaAtual.inicio_atendimento_em)}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                      {(senhaAtual.status === STATUS_SENHA.CHAMADA ||
                        senhaAtual.status === STATUS_SENHA.CHAMADA_NOVAMENTE) && (
                        <Button
                          variant="success"
                          size="lg"
                          className="w-full sm:w-auto"
                          disabled={operacaoOcupada}
                          carregando={acaoEmCurso === 'iniciar'}
                          textoCarregando="Iniciando..."
                          onClick={() => void handleAcaoSenha('iniciar')}
                        >
                          <Play aria-hidden="true" className="h-4 w-4" />
                          <span>Iniciar Atendimento</span>
                        </Button>
                      )}

                      {senhaAtual.status === STATUS_SENHA.CHAMADA && (
                        <Button
                          variant="secondary"
                          size="lg"
                          className="w-full sm:w-auto"
                          disabled={operacaoOcupada}
                          carregando={acaoEmCurso === 'rechamar'}
                          textoCarregando="Rechamando..."
                          onClick={() => void handleAcaoSenha('rechamar')}
                        >
                          <Megaphone aria-hidden="true" className="h-4 w-4" />
                          <span>Chamar Novamente</span>
                        </Button>
                      )}

                      {senhaAtual.status === STATUS_SENHA.CHAMADA_NOVAMENTE && (
                        <Button
                          variant="danger"
                          size="lg"
                          className="w-full sm:w-auto"
                          disabled={operacaoOcupada}
                          carregando={acaoEmCurso === 'nao-compareceu'}
                          textoCarregando="Registrando..."
                          onClick={() => void handleAcaoSenha('nao-compareceu')}
                        >
                          <UserX aria-hidden="true" className="h-4 w-4" />
                          <span>Não Compareceu</span>
                        </Button>
                      )}

                      {senhaAtual.status === STATUS_SENHA.EM_ATENDIMENTO && (
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full sm:w-auto"
                          disabled={operacaoOcupada}
                          carregando={acaoEmCurso === 'finalizar'}
                          textoCarregando="Finalizando..."
                          onClick={() => void handleAcaoSenha('finalizar')}
                        >
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                          <span>Finalizar Atendimento</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-6 sm:p-8 text-center space-y-4">
                    <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-sky-400">
                      <Bell aria-hidden="true" className="h-6 w-6" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-white">
                        {guicheAtual
                          ? `${guicheAtual.nome} livre para chamada`
                          : 'Guichê livre para chamada'}
                      </p>
                      <p className="text-sm text-slate-400">
                        {fila.total > 0
                          ? `Há ${fila.total} ${fila.total === 1 ? 'senha aguardando' : 'senhas aguardando'} na fila.`
                          : 'Não há senhas aguardando na fila no momento.'}
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full sm:w-auto"
                      disabled={
                        !guicheId ||
                        fila.total === 0 ||
                        expedienteFechado ||
                        operacaoOcupada
                      }
                      carregando={acaoEmCurso === 'chamar'}
                      textoCarregando="Chamando..."
                      onClick={() => void handleChamarProximo()}
                    >
                      <Bell aria-hidden="true" className="h-4 w-4" />
                      <span>Chamar Próximo</span>
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            <aside className="lg:col-span-4 space-y-5 sm:space-y-6">
              <Card
                titulo="Fila de Espera"
                subtitulo="Senhas aguardando chamada hoje"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <Users aria-hidden="true" className="h-4 w-4 text-sky-400" />
                      Total aguardando
                    </span>
                    <span className="tabular-nums text-2xl font-bold text-white">
                      {fila.total}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {([TIPOS_SENHA.SP, TIPOS_SENHA.SE, TIPOS_SENHA.SG] as const).map(
                      (tipo) => (
                        <div
                          key={tipo}
                          className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-center space-y-1 transition-colors duration-200 hover:border-slate-700"
                        >
                          <Badge tone={tomPrioridade(tipo)}>{tipo}</Badge>
                          <p className="tabular-nums text-2xl font-bold text-white">
                            {fila[tipo]}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {ROTULOS_TIPO_SENHA[tipo]}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </Card>

              <Card
                titulo="Regra de Priorização"
                subtitulo="Ordem de busca na próxima chamada"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Layers aria-hidden="true" className="h-4 w-4 text-slate-400" />
                    {(resumo?.proxima_ordem_prioridade ?? ['SP', 'SE', 'SG']).map(
                      (tipo, indice, lista) => (
                        <span key={tipo} className="inline-flex items-center gap-2">
                          <Badge tone={tomPrioridade(tipo)}>{tipo}</Badge>
                          {indice < lista.length - 1 && (
                            <span aria-hidden="true" className="text-slate-500 text-xs">
                              →
                            </span>
                          )}
                        </span>
                      ),
                    )}
                  </div>

                  <dl className="space-y-2 border-t border-slate-800 pt-3 text-xs text-slate-400">
                    <div className="flex items-center justify-between gap-2">
                      <dt>Última chamada do ciclo</dt>
                      <dd className="font-semibold text-slate-200">
                        {resumo?.ultima_prioridade_chamada ?? 'Nenhuma hoje'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt>Prazo pós 2ª chamada</dt>
                      <dd className="font-semibold text-slate-200 tabular-nums">
                        {formatarDuracao(limiteAbandono)}
                      </dd>
                    </div>
                    {resumo?.expediente && (
                      <div className="flex items-center justify-between gap-2">
                        <dt>Expediente</dt>
                        <dd className="font-semibold text-slate-200 tabular-nums">
                          {resumo.expediente.expediente_inicio} –{' '}
                          {resumo.expediente.expediente_fim}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </Card>
            </aside>
          </div>
        </div>
      )}
    </PageShell>
  )
}