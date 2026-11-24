import {
  Clock,
  Maximize2,
  Megaphone,
  Minimize2,
  Monitor,
  RefreshCw,
  Ticket,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Spinner } from '../components/ui'
import {
  lerCachePainel,
  obterUltimosChamados,
} from '../services/painelService'
import {
  anunciarChamado,
  falarTexto,
  montarTextoAnuncio,
  pararAnuncio,
  ttsSuportado,
} from '../services/voz'
import {
  STATUS_SENHA,
  TIPOS_SENHA,
  type ChamadoPainel,
  type RespostaPainelChamados,
  type TipoSenha,
} from '../types'

const INTERVALO_ONLINE_MS = 3000
const INTERVALO_RETRY_OFFLINE_MS = 5000

function gerarAssinaturaChamado(chamado: ChamadoPainel | null): string | null {
  if (!chamado) return null
  return `${chamado.id}-${chamado.numero_chamada}-${chamado.chamada_em ?? ''}`
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

function formatarDataHoraCurta(iso: string | null): string {
  if (!iso) return '--'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '--'
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

function obterTomPrioridade(tipo: TipoSenha): 'amber' | 'sky' | 'emerald' {
  if (tipo === TIPOS_SENHA.SP) return 'amber'
  if (tipo === TIPOS_SENHA.SE) return 'sky'
  return 'emerald'
}

function obterInfoStatusPainel(chamado: ChamadoPainel): {
  rotulo: string
  tone: 'sky' | 'amber' | 'emerald' | 'rose' | 'neutral'
  encerrado: boolean
} {
  switch (chamado.status) {
    case STATUS_SENHA.CHAMADA:
      return { rotulo: '1ª Chamada', tone: 'sky', encerrado: false }
    case STATUS_SENHA.CHAMADA_NOVAMENTE:
      return { rotulo: 'Última chamada (2ª)', tone: 'amber', encerrado: false }
    case STATUS_SENHA.EM_ATENDIMENTO:
      return { rotulo: 'Em atendimento', tone: 'emerald', encerrado: false }
    case STATUS_SENHA.ATENDIDA:
      return { rotulo: 'Finalizada', tone: 'neutral', encerrado: true }
    case STATUS_SENHA.NAO_COMPARECEU:
      return { rotulo: 'Não compareceu', tone: 'rose', encerrado: true }
    default:
      return { rotulo: chamado.rotulo_chamada, tone: 'neutral', encerrado: false }
  }
}

export default function PainelPage() {
  const cacheInicial = useRef(lerCachePainel())

  const [painel, setPainel] = useState<RespostaPainelChamados | null>(
    cacheInicial.current?.dados ?? null,
  )
  const [cacheSalvoEm, setCacheSalvoEm] = useState<string | null>(
    cacheInicial.current?.salvoEm ?? null,
  )
  const [carregandoInicial, setCarregandoInicial] = useState<boolean>(
    cacheInicial.current === null,
  )
  const [modoFallback, setModoFallback] = useState<boolean>(false)
  const [tentativasReconexao, setTentativasReconexao] = useState<number>(0)
  const [reconectandoAgora, setReconectandoAgora] = useState<boolean>(false)

  const [suportaTts] = useState<boolean>(() => ttsSuportado())
  const [audioAtivo, setAudioAtivo] = useState<boolean>(false)
  const [ultimoAnuncio, setUltimoAnuncio] = useState<string | null>(null)
  const [destaquePulsando, setDestaquePulsando] = useState<boolean>(false)

  const [telaCheia, setTelaCheia] = useState<boolean>(false)
  const [relogio, setRelogio] = useState<Date>(() => new Date())

  const inicializadoRef = useRef<boolean>(false)
  const ultimaAssinaturaRef = useRef<string | null>(
    gerarAssinaturaChamado(cacheInicial.current?.dados.chamada_atual ?? null),
  )
  const audioAtivoRef = useRef<boolean>(false)
  const timerPulsoRef = useRef<number | null>(null)

  useEffect(() => {
    audioAtivoRef.current = audioAtivo
  }, [audioAtivo])

  useEffect(() => {
    const id = window.setInterval(() => setRelogio(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setTelaCheia(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    return () => {
      pararAnuncio()
      if (timerPulsoRef.current !== null) {
        window.clearTimeout(timerPulsoRef.current)
      }
    }
  }, [])

  const dispararDestaque = useCallback(() => {
    setDestaquePulsando(true)
    if (timerPulsoRef.current !== null) {
      window.clearTimeout(timerPulsoRef.current)
    }
    timerPulsoRef.current = window.setTimeout(() => {
      setDestaquePulsando(false)
    }, 4500)
  }, [])

  const buscarChamados = useCallback(
    async (manual = false) => {
      if (manual) {
        setReconectandoAgora(true)
      }

      try {
        const dados = await obterUltimosChamados()
        setPainel(dados)
        setCacheSalvoEm(dados.atualizado_em)
        setModoFallback(false)
        setTentativasReconexao(0)

        const assinaturaAtual = gerarAssinaturaChamado(dados.chamada_atual)

        if (!inicializadoRef.current) {
          inicializadoRef.current = true
          ultimaAssinaturaRef.current = assinaturaAtual
        } else if (
          dados.chamada_atual &&
          assinaturaAtual !== ultimaAssinaturaRef.current
        ) {
          ultimaAssinaturaRef.current = assinaturaAtual
          dispararDestaque()

          const texto = montarTextoAnuncio(dados.chamada_atual)
          setUltimoAnuncio(texto)

          if (audioAtivoRef.current) {
            anunciarChamado(dados.chamada_atual)
          }
        }
      } catch {
        setModoFallback(true)
        setTentativasReconexao((atual) => atual + 1)

        const cacheAtual = lerCachePainel()
        if (cacheAtual) {
          setPainel(cacheAtual.dados)
          setCacheSalvoEm(cacheAtual.salvoEm)
        }
      } finally {
        setCarregandoInicial(false)
        if (manual) {
          setReconectandoAgora(false)
        }
      }
    },
    [dispararDestaque],
  )

  useEffect(() => {
    void buscarChamados(false)
  }, [buscarChamados])

  useEffect(() => {
    const intervalo = modoFallback
      ? INTERVALO_RETRY_OFFLINE_MS
      : INTERVALO_ONLINE_MS

    const id = window.setInterval(() => {
      void buscarChamados(false)
    }, intervalo)

    return () => window.clearInterval(id)
  }, [buscarChamados, modoFallback])

  const alternarAudio = () => {
    if (!suportaTts) return

    if (audioAtivo) {
      pararAnuncio()
      setAudioAtivo(false)
      return
    }

    setAudioAtivo(true)
    if (painel?.chamada_atual) {
      const texto = montarTextoAnuncio(painel.chamada_atual)
      setUltimoAnuncio(texto)
      anunciarChamado(painel.chamada_atual)
    } else {
      falarTexto('Áudio do painel de chamados ativado.')
    }
  }

  const repetirAnuncioAtual = () => {
    if (!suportaTts || !painel?.chamada_atual) return
    setAudioAtivo(true)
    const texto = montarTextoAnuncio(painel.chamada_atual)
    setUltimoAnuncio(texto)
    dispararDestaque()
    anunciarChamado(painel.chamada_atual)
  }

  const alternarTelaCheia = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // navegador pode recusar fullscreen sem gesto suportado
    }
  }

  const chamadaAtual = painel?.chamada_atual ?? null
  const ultimosChamados = (painel?.chamados ?? []).slice(0, 5)
  const infoStatusAtual = chamadaAtual ? obterInfoStatusPainel(chamadaAtual) : null
  const ehSegundaChamadaAtual = Boolean(
    chamadaAtual && chamadaAtual.status === STATUS_SENHA.CHAMADA_NOVAMENTE,
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <a
        href="#painel-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-sky-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Pular para o painel de chamados
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-900/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link
              to="/"
              className="group flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight text-white rounded-lg px-1 py-0.5 transition-colors hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 shrink-0"
            >
              <Ticket
                aria-hidden="true"
                className="h-5 w-5 text-sky-400 transition-transform duration-200 group-hover:-rotate-6"
              />
              <span>nassauTickets</span>
            </Link>

            <span className="hidden md:inline-flex items-center gap-1.5 text-sm text-slate-400 border-l border-slate-800 pl-4">
              <Monitor aria-hidden="true" className="h-4 w-4 text-sky-400" />
              Painel de Chamados
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={modoFallback ? 'rose' : 'emerald'}>
              {modoFallback ? (
                <>
                  <WifiOff aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Contingência</span>
                </>
              ) : (
                <>
                  <Wifi aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Online</span>
                </>
              )}
            </Badge>

            {suportaTts && (
              <Button
                variant={audioAtivo ? 'success' : 'secondary'}
                size="sm"
                onClick={alternarAudio}
                aria-pressed={audioAtivo}
              >
                {audioAtivo ? (
                  <Volume2 aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <VolumeX aria-hidden="true" className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {audioAtivo ? 'Áudio ativo' : 'Ativar áudio'}
                </span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => void alternarTelaCheia()}
              aria-label={telaCheia ? 'Sair da tela cheia' : 'Abrir em tela cheia'}
            >
              {telaCheia ? (
                <Minimize2 aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Maximize2 aria-hidden="true" className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {telaCheia ? 'Sair' : 'Tela cheia'}
              </span>
            </Button>

            <div
              aria-label="Horário atual"
              className="flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs sm:text-sm font-semibold tabular-nums text-slate-100"
            >
              <Clock aria-hidden="true" className="h-4 w-4 text-sky-400 shrink-0" />
              <span>
                {relogio.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main
        id="painel-principal"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 sm:py-6 space-y-5 focus:outline-none animate-slide-up"
      >
        {modoFallback && (
          <Alert
            variant="warning"
            titulo="Conexão temporariamente interrompida — Modo de contingência ativo"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <p>
                  Não foi possível comunicar com o servidor. Exibindo as últimas
                  chamadas armazenadas em cache local
                  {cacheSalvoEm
                    ? ` (última sincronização: ${formatarDataHoraCurta(cacheSalvoEm)}).`
                    : '.'}
                </p>
                <p className="text-xs text-amber-200/80 tabular-nums">
                  Tentando reconectar automaticamente a cada{' '}
                  {INTERVALO_RETRY_OFFLINE_MS / 1000}s (tentativa #
                  {tentativasReconexao}).
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto shrink-0"
                carregando={reconectandoAgora}
                textoCarregando="Reconectando..."
                onClick={() => void buscarChamados(true)}
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                <span>Reconectar agora</span>
              </Button>
            </div>
          </Alert>
        )}

        {!suportaTts && (
          <Alert variant="info" titulo="Síntese de voz indisponível">
            Este navegador não oferece suporte à Web Speech API. Os chamados
            continuam sendo exibidos normalmente na tela.
          </Alert>
        )}

        {suportaTts && !audioAtivo && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
            <span>
              Clique em <strong>Ativar áudio</strong> para habilitar os anúncios
              por voz automáticos nas novas chamadas.
            </span>
            <Button
              variant="primary"
              size="sm"
              className="w-full sm:w-auto shrink-0"
              onClick={alternarAudio}
            >
              <Volume2 aria-hidden="true" className="h-4 w-4" />
              <span>Ativar áudio agora</span>
            </Button>
          </div>
        )}

        {carregandoInicial ? (
          <div className="flex min-h-[55vh] items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
            <Spinner tamanho="lg" rotulo="Carregando painel de chamados..." />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            <section
              aria-label="Chamada atual em destaque"
              aria-live="assertive"
              aria-atomic="true"
              className={`lg:col-span-7 flex flex-col justify-between rounded-3xl border p-5 sm:p-8 xl:p-10 transition-all duration-300 ${
                ehSegundaChamadaAtual
                  ? 'border-amber-400/70 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950'
                  : infoStatusAtual?.encerrado
                    ? 'border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950'
                    : 'border-sky-500/40 bg-gradient-to-br from-sky-950/35 via-slate-900 to-slate-950'
              } ${destaquePulsando ? 'ring-4 ring-sky-400/50 scale-[1.005]' : ''}`}
            >
              {chamadaAtual && infoStatusAtual ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={obterTomPrioridade(chamadaAtual.tipo)}>
                        {chamadaAtual.tipo} — {chamadaAtual.prioridade_label}
                      </Badge>
                      <Badge
                        tone={infoStatusAtual.tone}
                        className="text-xs sm:text-sm px-3 py-1"
                      >
                        {infoStatusAtual.rotulo}
                      </Badge>
                    </div>

                    {suportaTts && !infoStatusAtual.encerrado && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={repetirAnuncioAtual}
                        aria-label="Repetir anúncio por voz da senha atual"
                      >
                        <Megaphone aria-hidden="true" className="h-4 w-4" />
                        <span>Repetir voz</span>
                      </Button>
                    )}
                  </div>

                  <div
                    key={gerarAssinaturaChamado(chamadaAtual)}
                    className="my-8 sm:my-10 text-center space-y-5 sm:space-y-6 animate-pop-in"
                  >
                    <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {infoStatusAtual.encerrado
                        ? 'Última senha chamada'
                        : 'Senha chamada'}
                    </p>
                    <p className="tabular-nums text-4xl sm:text-6xl xl:text-7xl 2xl:text-8xl font-extrabold tracking-tight text-white break-words">
                      {chamadaAtual.codigo}
                    </p>
                    <div className="inline-flex flex-col items-center rounded-2xl border border-slate-700/80 bg-slate-950/80 px-6 sm:px-8 py-3.5 sm:py-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {infoStatusAtual.encerrado ? 'Guichê' : 'Dirija-se ao'}
                      </span>
                      <span className="mt-1 text-2xl sm:text-4xl xl:text-5xl font-bold text-sky-300">
                        {chamadaAtual.guiche_nome ?? 'Recepção'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-4 text-xs sm:text-sm text-slate-400">
                    <span>
                      Horário da chamada:{' '}
                      <strong className="text-slate-200 tabular-nums">
                        {formatarHora(chamadaAtual.chamada_em)}
                      </strong>
                    </span>
                    {ultimoAnuncio && (
                      <span className="truncate max-w-full sm:max-w-md text-slate-400">
                        Voz: &ldquo;{ultimoAnuncio}&rdquo;
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="my-auto py-12 sm:py-16 text-center space-y-4">
                  <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-sky-400">
                    <Monitor aria-hidden="true" className="h-8 w-8" />
                  </div>
                  <h1 className="text-xl sm:text-3xl font-bold text-white">
                    Aguardando próximas chamadas
                  </h1>
                  <p className="mx-auto max-w-md text-sm sm:text-base text-slate-400 leading-relaxed">
                    Assim que um atendente realizar uma chamada, a senha e o
                    guichê aparecerão automaticamente em destaque nesta tela.
                  </p>
                </div>
              )}
            </section>

            <aside
              aria-label="Últimas 5 senhas chamadas"
              className="lg:col-span-5 flex flex-col rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6"
            >
              <header className="mb-4 flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white">
                    Últimas chamadas
                  </h2>
                  <p className="text-xs text-slate-400">
                    Histórico exclusivo das 5 chamadas mais recentes
                  </p>
                </div>
                <Badge tone="neutral" className="tabular-nums">
                  {ultimosChamados.length} / 5
                </Badge>
              </header>

              {ultimosChamados.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-12 text-center text-sm text-slate-400">
                  Nenhuma senha chamada hoje até o momento.
                </div>
              ) : (
                <ol className="space-y-3 flex-1">
                  {ultimosChamados.map((item, indice) => {
                    const ehTopo = indice === 0
                    const statusItem = obterInfoStatusPainel(item)

                    return (
                      <li
                        key={`${item.id}-${item.numero_chamada}`}
                        className={`flex items-center justify-between gap-3 sm:gap-4 rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 hover:border-slate-700 ${
                          ehTopo && !statusItem.encerrado
                            ? 'border-sky-500/50 bg-sky-950/30'
                            : 'border-slate-800 bg-slate-950/70'
                        } ${statusItem.encerrado ? 'opacity-75 hover:opacity-100' : ''}`}
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="tabular-nums text-lg sm:text-2xl font-bold text-white">
                              {item.codigo}
                            </span>
                            <Badge tone={obterTomPrioridade(item.tipo)}>
                              {item.tipo}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <Badge tone={statusItem.tone}>
                              {statusItem.rotulo}
                            </Badge>
                            <span aria-hidden="true">•</span>
                            <span className="tabular-nums">
                              {formatarHora(item.chamada_em)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[11px] uppercase tracking-wider text-slate-500">
                            Guichê
                          </p>
                          <p className="text-base sm:text-xl font-bold text-sky-300">
                            {item.guiche_nome ?? '--'}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}

              <footer className="mt-4 border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="tabular-nums">
                  Atualizado em: {formatarHora(painel?.atualizado_em ?? null)}
                </span>
                <span>Atualização automática</span>
              </footer>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}