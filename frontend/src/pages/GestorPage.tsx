import {
  BarChart3,
  ClipboardList,
  FileText,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuditoriaSection } from '../components/gestor/AuditoriaSection'
import { CadastrosSection } from '../components/gestor/CadastrosSection'
import { DesempenhoSection } from '../components/gestor/DesempenhoSection'
import { RelatorioDetalhadoSection } from '../components/gestor/RelatorioDetalhadoSection'
import { VisaoGeralSection } from '../components/gestor/VisaoGeralSection'
import { PageShell } from '../components/layout/PageShell'
import { Alert, Button, Card, Spinner } from '../components/ui'
import { extrairMensagemErro } from '../services/api'
import {
  obterRelatorioDesempenho,
  obterRelatorioQuantitativo,
  obterRelatorioTempoMedio,
} from '../services/gestorService'
import type {
  FiltroPeriodoPayload,
  RelatorioDesempenho,
  RelatorioQuantitativo,
  RelatorioTempoMedio,
  TipoPeriodoRelatorio,
} from '../types'

type AbaGestor = 'visao-geral' | 'desempenho' | 'detalhado' | 'auditoria' | 'cadastros'

interface DefinicaoAba {
  id: AbaGestor
  rotulo: string
  Icone: typeof BarChart3
}

const ABAS: DefinicaoAba[] = [
  { id: 'visao-geral', rotulo: 'Visão Geral & TM', Icone: BarChart3 },
  { id: 'desempenho', rotulo: 'Desempenho', Icone: Users },
  { id: 'detalhado', rotulo: 'Relatório Detalhado', Icone: FileText },
  { id: 'auditoria', rotulo: 'Auditoria', Icone: ClipboardList },
  { id: 'cadastros', rotulo: 'Cadastros', Icone: ShieldCheck },
]

function obterDataLocalISO(): string {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function obterMesLocalISO(): string {
  return obterDataLocalISO().slice(0, 7)
}

export default function GestorPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaGestor>('visao-geral')
  const [periodo, setPeriodo] = useState<TipoPeriodoRelatorio>('diario')
  const [dataRef, setDataRef] = useState<string>(() => obterDataLocalISO())
  const [mesRef, setMesRef] = useState<string>(() => obterMesLocalISO())

  const [quantitativo, setQuantitativo] = useState<RelatorioQuantitativo | null>(
    null,
  )
  const [tempoMedio, setTempoMedio] = useState<RelatorioTempoMedio | null>(null)
  const [desempenho, setDesempenho] = useState<RelatorioDesempenho | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [chaveAtualizacao, setChaveAtualizacao] = useState(0)

  const filtroPeriodo = useMemo<FiltroPeriodoPayload>(
    () =>
      periodo === 'diario'
        ? { periodo: 'diario', data: dataRef }
        : { periodo: 'mensal', mes: mesRef },
    [periodo, dataRef, mesRef],
  )

  const carregarConsolidado = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const [dadosQ, dadosTm, dadosDesempenho] = await Promise.all([
        obterRelatorioQuantitativo(filtroPeriodo),
        obterRelatorioTempoMedio(filtroPeriodo),
        obterRelatorioDesempenho(filtroPeriodo),
      ])
      setQuantitativo(dadosQ)
      setTempoMedio(dadosTm)
      setDesempenho(dadosDesempenho)
    } catch (falha) {
      setErro(
        extrairMensagemErro(
          falha,
          'Não foi possível carregar os indicadores gerenciais.',
        ),
      )
    } finally {
      setCarregando(false)
    }
  }, [filtroPeriodo])

  useEffect(() => {
    void carregarConsolidado()
  }, [carregarConsolidado])

  const handleAtualizarTudo = async () => {
    setChaveAtualizacao((atual) => atual + 1)
    await carregarConsolidado()
  }

  return (
    <PageShell
      titulo="Painel do Gestor"
      subtitulo="Indicadores operacionais, relatórios diários/mensais, auditoria e gestão de cadastros."
    >
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 rounded-2xl border border-slate-800/90 bg-slate-900/90 p-3 sm:p-4">
          <div
            role="tablist"
            aria-label="Seções do painel do gestor"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 xl:pb-0 -mx-1 px-1"
          >
            {ABAS.map(({ id, rotulo, Icone }) => {
              const selecionada = abaAtiva === id
              return (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={selecionada}
                  onClick={() => setAbaAtiva(id)}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    selecionada
                      ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm shadow-sky-500/20'
                      : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <Icone aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>{rotulo}</span>
                </button>
              )
            })}
          </div>

          {abaAtiva !== 'cadastros' && (
            <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-800 pt-3 xl:border-t-0 xl:pt-0 shrink-0">
              <div
                role="group"
                aria-label="Tipo de período"
                className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setPeriodo('diario')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    periodo === 'diario'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Diário
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodo('mensal')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    periodo === 'mensal'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mensal
                </button>
              </div>

              {periodo === 'diario' ? (
                <input
                  type="date"
                  aria-label="Data de referência"
                  value={dataRef}
                  onChange={(e) => setDataRef(e.target.value)}
                  className="min-h-9 flex-1 sm:flex-initial rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium tabular-nums text-slate-100 transition-colors hover:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                />
              ) : (
                <input
                  type="month"
                  aria-label="Mês de referência"
                  value={mesRef}
                  onChange={(e) => setMesRef(e.target.value)}
                  className="min-h-9 flex-1 sm:flex-initial rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium tabular-nums text-slate-100 transition-colors hover:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                />
              )}

              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                carregando={carregando}
                textoCarregando="Atualizando..."
                onClick={() => void handleAtualizarTudo()}
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                <span>Atualizar</span>
              </Button>
            </div>
          )}
        </div>

        {erro && abaAtiva !== 'cadastros' && (
          <Alert variant="error" titulo="Erro ao carregar indicadores">
            {erro}
          </Alert>
        )}

        <div key={abaAtiva} className="animate-fade-in">
          {abaAtiva === 'visao-geral' &&
            (carregando ? (
              <Card>
                <div className="py-12 flex justify-center">
                  <Spinner tamanho="lg" rotulo="Consolidando indicadores..." />
                </div>
              </Card>
            ) : (
              <VisaoGeralSection
                quantitativo={quantitativo}
                tempoMedio={tempoMedio}
                aoAtualizarDados={handleAtualizarTudo}
              />
            ))}

          {abaAtiva === 'desempenho' &&
            (carregando ? (
              <Card>
                <div className="py-12 flex justify-center">
                  <Spinner tamanho="lg" rotulo="Carregando desempenho..." />
                </div>
              </Card>
            ) : (
              <DesempenhoSection desempenho={desempenho} />
            ))}

          {abaAtiva === 'detalhado' && (
            <RelatorioDetalhadoSection
              filtroPeriodo={filtroPeriodo}
              chaveAtualizacao={chaveAtualizacao}
            />
          )}

          {abaAtiva === 'auditoria' && (
            <AuditoriaSection
              filtroPeriodo={filtroPeriodo}
              chaveAtualizacao={chaveAtualizacao}
            />
          )}

          {abaAtiva === 'cadastros' && <CadastrosSection />}
        </div>
      </div>
    </PageShell>
  )
}