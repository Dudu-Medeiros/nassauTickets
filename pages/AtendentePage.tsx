import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCircle2, Megaphone, Play, UserX } from 'lucide-react'
import { PageShell } from '../components/layout/PageShell'
import { Alert, Button, Card, Spinner } from '../components/ui'
import { mensagemDeErro } from '../services/api'
import { chamarProximo, executarAcao, listarGuichesAtivos, obterResumo } from '../services/atendimentoService'
import type { AcaoSenha } from '../services/atendimentoService'
import { ROTULOS_TIPO_SENHA, STATUS_SENHA } from '../types'
import type { Guiche, ResumoAtendimento } from '../types'

const CHAVE_GUICHE = 'nassautickets:guiche'
const INTERVALO_MS = 5000

function lerGuicheSalvo(): number | null {
  try {
    const v = localStorage.getItem(CHAVE_GUICHE)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

function formatarDuracao(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export default function AtendentePage() {
  const [guiches, setGuiches] = useState<Guiche[]>([])
  const [guicheId, setGuicheId] = useState<number | null>(lerGuicheSalvo)
  const [resumo, setResumo] = useState<ResumoAtendimento | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [agora, setAgora] = useState(() => Date.now())

  const carregarResumo = useCallback(async () => {
    try {
      setResumo(await obterResumo())
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }, [])

  useEffect(() => {
    let ativo = true
    Promise.all([listarGuichesAtivos(), obterResumo()])
      .then(([g, r]) => {
        if (!ativo) return
        setGuiches(g)
        setResumo(r)
        // guichê salvo que não existe mais é descartado
        setGuicheId((atual) => (atual !== null && g.some((x) => x.id === atual) ? atual : null))
      })
      .catch((e) => ativo && setErro(mensagemDeErro(e)))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  // Atualiza fila/senha atual (abandono automático e novas senhas).
  useEffect(() => {
    const id = setInterval(carregarResumo, INTERVALO_MS)
    return () => clearInterval(id)
  }, [carregarResumo])

  // Cronômetro em tempo real.
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  function escolherGuiche(valor: string) {
    const id = valor ? Number(valor) : null
    setGuicheId(id)
    try {
      if (id === null) localStorage.removeItem(CHAVE_GUICHE)
      else localStorage.setItem(CHAVE_GUICHE, String(id))
    } catch {
      /* armazenamento indisponível */
    }
  }

  async function rodar(fn: () => Promise<unknown>) {
    setErro(null)
    setOcupado(true)
    try {
      await fn()
      await carregarResumo()
    } catch (e) {
      setErro(mensagemDeErro(e))
      await carregarResumo()
    } finally {
      setOcupado(false)
    }
  }

  const acao = (a: AcaoSenha, id: number) => () => rodar(() => executarAcao(a, id))

  const senha = resumo?.senha_atual ?? null
  const status = senha?.status
  const emAtendimento = status === STATUS_SENHA.EM_ATENDIMENTO
  const chamada = status === STATUS_SENHA.CHAMADA
  const chamadaNovamente = status === STATUS_SENHA.CHAMADA_NOVAMENTE
  const inicio = senha?.inicio_atendimento_em ? new Date(senha.inicio_atendimento_em).getTime() : null
  const decorrido = emAtendimento && inicio ? (agora - inicio) / 1000 : 0

  return (
    <PageShell titulo="Terminal do Atendente">
      {carregando ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-6">
          {erro && <Alert tipo="erro">{erro}</Alert>}
          {resumo && !resumo.expediente.aberto && (
            <Alert tipo="info">
              Fora do expediente ({resumo.expediente.expediente_inicio} às {resumo.expediente.expediente_fim}).
            </Alert>
          )}

          <Card>
            <label htmlFor="guiche" className="mb-1.5 block text-sm font-medium text-slate-200">
              Guichê de atendimento
            </label>
            <select
              id="guiche"
              value={guicheId ?? ''}
              onChange={(e) => escolherGuiche(e.target.value)}
              disabled={senha !== null}
              className="min-h-11 w-full max-w-xs rounded-lg border border-slate-600 bg-slate-900 px-3 text-base text-slate-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-50"
            >
              <option value="">Selecione…</option>
              {guiches.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
            {senha && <p className="mt-1.5 text-sm text-slate-300">Finalize a senha atual para trocar de guichê.</p>}
          </Card>

          {resumo && (
            <Card aria-label="Fila de espera">
              <h2 className="mb-3 text-lg font-semibold">Fila de espera ({resumo.fila_aguardando.total})</h2>
              <ul className="flex flex-wrap gap-6 text-slate-200">
                {(['SP', 'SE', 'SG'] as const).map((t) => (
                  <li key={t}>
                    <span className="text-2xl font-bold">{resumo.fila_aguardando[t]}</span>{' '}
                    <span className="text-sm text-slate-300">{ROTULOS_TIPO_SENHA[t]}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card aria-live="polite">
            {senha ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-slate-300">
                    {ROTULOS_TIPO_SENHA[senha.tipo]} · {senha.status.replaceAll('_', ' ')}
                  </p>
                  <p className="font-mono text-5xl font-bold tracking-wider">{senha.codigo}</p>
                </div>
                {emAtendimento && (
                  <p className="text-3xl font-semibold tabular-nums" role="timer" aria-label="Tempo de atendimento">
                    {formatarDuracao(decorrido)}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button variante="secondary" disabled={ocupado || !chamada} onClick={acao('rechamar', senha.id)}>
                    <Bell className="size-5" aria-hidden="true" />
                    Chamar novamente
                  </Button>
                  <Button disabled={ocupado || !(chamada || chamadaNovamente)} onClick={acao('iniciar', senha.id)}>
                    <Play className="size-5" aria-hidden="true" />
                    Iniciar atendimento
                  </Button>
                  <Button variante="danger" disabled={ocupado || !chamadaNovamente} onClick={acao('nao-compareceu', senha.id)}>
                    <UserX className="size-5" aria-hidden="true" />
                    Não compareceu
                  </Button>
                  <Button disabled={ocupado || !emAtendimento} onClick={acao('finalizar', senha.id)}>
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                    Finalizar atendimento
                  </Button>
                </div>
                {chamada && (
                  <p className="text-sm text-slate-300">
                    “Não compareceu” só é liberado após a 2ª chamada.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-slate-300">Nenhuma senha em atendimento.</p>
                <Button
                  tamanho="lg"
                  disabled={ocupado || guicheId === null || resumo?.fila_aguardando.total === 0}
                  carregando={ocupado}
                  onClick={() => rodar(() => chamarProximo(guicheId as number))}
                >
                  <Megaphone className="size-5" aria-hidden="true" />
                  Chamar próximo
                </Button>
                {guicheId === null && <p className="text-sm text-slate-300">Selecione um guichê para chamar.</p>}
              </div>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  )
}
