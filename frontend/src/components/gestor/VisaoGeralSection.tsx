import {
  Clock,
  Download,
  FileSpreadsheet,
  Power,
  ShieldAlert,
} from 'lucide-react'
import { useState } from 'react'
import { extrairMensagemErro } from '../../services/api'
import { encerrarExpedienteManual } from '../../services/gestorService'
import {
  ROTULOS_TIPO_SENHA,
  TIPOS_SENHA,
  type RelatorioQuantitativo,
  type RelatorioTempoMedio,
  type ResultadoEncerramentoExpediente,
  type TipoSenha,
} from '../../types'
import { exportarCsv, exportarJson } from '../../utils/exportarArquivo'
import { Alert, Badge, Button, Card } from '../ui'

interface VisaoGeralSectionProps {
  quantitativo: RelatorioQuantitativo | null
  tempoMedio: RelatorioTempoMedio | null
  aoAtualizarDados: () => Promise<void>
}

const TIPOS: TipoSenha[] = [TIPOS_SENHA.SP, TIPOS_SENHA.SE, TIPOS_SENHA.SG]

function tomTipo(tipo: TipoSenha): 'amber' | 'sky' | 'emerald' {
  if (tipo === TIPOS_SENHA.SP) return 'amber'
  if (tipo === TIPOS_SENHA.SE) return 'sky'
  return 'emerald'
}

function corBarraTipo(tipo: TipoSenha): string {
  if (tipo === TIPOS_SENHA.SP) return 'bg-amber-400'
  if (tipo === TIPOS_SENHA.SE) return 'bg-sky-400'
  return 'bg-emerald-400'
}

export function VisaoGeralSection({
  quantitativo,
  tempoMedio,
  aoAtualizarDados,
}: VisaoGeralSectionProps) {
  const [confirmandoEncerramento, setConfirmandoEncerramento] = useState(false)
  const [encerrando, setEncerrando] = useState(false)
  const [resultadoEncerramento, setResultadoEncerramento] =
    useState<ResultadoEncerramentoExpediente | null>(null)
  const [erroEncerramento, setErroEncerramento] = useState<string | null>(null)

  const handleExportarCsv = () => {
    if (!quantitativo || !tempoMedio) return
    const ref = quantitativo.filtro.referencia
    const cabecalhos = [
      'Categoria',
      'Emitidas',
      'Atendidas',
      'Não Compareceu',
      'Descartadas (17h)',
      'Em Aberto',
      'Taxa Atendimento (%)',
      'TM (mm:ss)',
      'TME (mm:ss)',
    ]

    const linhas = [
      [
        'GERAL',
        quantitativo.geral.emitidas,
        quantitativo.geral.atendidas,
        quantitativo.geral.nao_compareceu,
        quantitativo.geral.descartadas_fim_expediente,
        quantitativo.geral.em_aberto,
        quantitativo.geral.taxa_atendimento_percentual,
        tempoMedio.geral.tm_formatado ?? '-',
        tempoMedio.geral.tme_formatado ?? '-',
      ],
      ...TIPOS.map((tipo) => {
        const q = quantitativo.por_prioridade[tipo]
        const tm = tempoMedio.por_prioridade[tipo]
        return [
          `${tipo} - ${ROTULOS_TIPO_SENHA[tipo]}`,
          q.emitidas,
          q.atendidas,
          q.nao_compareceu,
          q.descartadas_fim_expediente,
          q.em_aberto,
          q.taxa_atendimento_percentual,
          tm.tm_formatado ?? '-',
          tm.tme_formatado ?? '-',
        ]
      }),
    ]

    exportarCsv(`relatorio-quantitativo-tm-${ref}.csv`, cabecalhos, linhas)
  }

  const handleExportarJson = () => {
    if (!quantitativo || !tempoMedio) return
    const ref = quantitativo.filtro.referencia
    exportarJson(`relatorio-quantitativo-tm-${ref}.json`, {
      quantitativo,
      tempo_medio: tempoMedio,
    })
  }

  const handleEncerrarExpediente = async () => {
    setErroEncerramento(null)
    setResultadoEncerramento(null)
    setEncerrando(true)

    try {
      const resultado = await encerrarExpedienteManual()
      setResultadoEncerramento(resultado)
      setConfirmandoEncerramento(false)
      await aoAtualizarDados()
    } catch (erro) {
      setErroEncerramento(
        extrairMensagemErro(erro, 'Não foi possível encerrar o expediente.'),
      )
    } finally {
      setEncerrando(false)
    }
  }

  if (!quantitativo || !tempoMedio) {
    return (
      <Card>
        <p className="text-sm text-slate-400">
          Nenhum dado consolidado para o período selecionado.
        </p>
      </Card>
    )
  }

  const g = quantitativo.geral
  const tmGeral = tempoMedio.geral

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Senhas Emitidas
          </p>
          <p className="mt-2 tabular-nums text-3xl font-bold text-white">
            {g.emitidas}
          </p>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            Em aberto: <strong className="text-slate-200">{g.em_aberto}</strong>
          </p>
        </Card>

        <Card className="p-5 border-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/50">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">
            Atendidas
          </p>
          <p className="mt-2 tabular-nums text-3xl font-bold text-emerald-200">
            {g.atendidas}
          </p>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            Taxa:{' '}
            <strong className="text-emerald-300">
              {g.taxa_atendimento_percentual}%
            </strong>
          </p>
        </Card>

        <Card className="p-5 border-rose-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-500/50">
          <p className="text-xs font-medium uppercase tracking-wider text-rose-300">
            Não Compareceu
          </p>
          <p className="mt-2 tabular-nums text-3xl font-bold text-rose-200">
            {g.nao_compareceu}
          </p>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            Taxa:{' '}
            <strong className="text-rose-300">
              {g.taxa_nao_comparecimento_percentual}%
            </strong>
          </p>
        </Card>

        <Card className="p-5 border-amber-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/50">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-300">
            Descartadas (17h)
          </p>
          <p className="mt-2 tabular-nums text-3xl font-bold text-amber-200">
            {g.descartadas_fim_expediente}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Pendentes no encerramento
          </p>
        </Card>

        <Card className="p-5 border-sky-500/30 sm:col-span-2 lg:col-span-1 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/50">
          <p className="text-xs font-medium uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
            <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span>Tempo Médio (TM)</span>
          </p>
          <p className="mt-2 tabular-nums text-3xl font-bold text-sky-200">
            {tmGeral.tm_formatado ?? '--:--'}
          </p>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            Espera (TME):{' '}
            <strong className="text-slate-200">
              {tmGeral.tme_formatado ?? '--:--'}
            </strong>
          </p>
        </Card>
      </div>

      <Card
        titulo="Quantitativo e Tempo Médio por Prioridade"
        subtitulo={`Período: ${quantitativo.filtro.data_inicio} a ${quantitativo.filtro.data_fim}`}
        acao={
          <>
            <Button variant="secondary" size="sm" onClick={handleExportarCsv}>
              <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
              <span>Exportar CSV</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportarJson}>
              <Download aria-hidden="true" className="h-4 w-4" />
              <span>JSON</span>
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIPOS.map((tipo) => {
            const dadosQ = quantitativo.por_prioridade[tipo]
            const dadosTm = tempoMedio.por_prioridade[tipo]
            const percentual = dadosQ.taxa_atendimento_percentual

            return (
              <div
                key={tipo}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 space-y-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={tomTipo(tipo)}>
                    {tipo} — {ROTULOS_TIPO_SENHA[tipo]}
                  </Badge>
                  <span className="tabular-nums text-xs text-slate-400">
                    {dadosQ.atendidas}/{dadosQ.emitidas} atend.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Taxa de atendimento</span>
                    <span className="font-semibold text-slate-200 tabular-nums">
                      {percentual}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={percentual}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Taxa de atendimento ${tipo}`}
                    className="h-2 w-full rounded-full bg-slate-800 overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${corBarraTipo(tipo)}`}
                      style={{ width: `${Math.min(100, percentual)}%` }}
                    />
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3 text-xs">
                  <div>
                    <dt className="text-slate-500">Emitidas</dt>
                    <dd className="tabular-nums text-sm font-semibold text-white">
                      {dadosQ.emitidas}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Atendidas</dt>
                    <dd className="tabular-nums text-sm font-semibold text-emerald-300">
                      {dadosQ.atendidas}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Não compareceu</dt>
                    <dd className="tabular-nums text-sm font-semibold text-rose-300">
                      {dadosQ.nao_compareceu}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Descartadas</dt>
                    <dd className="tabular-nums text-sm font-semibold text-amber-300">
                      {dadosQ.descartadas_fim_expediente}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Tempo Médio (TM)</dt>
                    <dd className="tabular-nums text-sm font-semibold text-sky-300">
                      {dadosTm.tm_formatado ?? '--:--'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Espera Média (TME)</dt>
                    <dd className="tabular-nums text-sm font-semibold text-slate-200">
                      {dadosTm.tme_formatado ?? '--:--'}
                    </dd>
                  </div>
                </dl>
              </div>
            )
          })}
        </div>
      </Card>

      <Card
        titulo="Rotina de Encerramento de Expediente"
        subtitulo="Descarta senhas remanescentes em AGUARDANDO no dia atual, preservando todos os atendimentos em curso."
        className="border-amber-500/30"
      >
        <div className="space-y-4">
          {erroEncerramento && (
            <Alert variant="error" titulo="Erro no encerramento">
              {erroEncerramento}
            </Alert>
          )}

          {resultadoEncerramento && (
            <Alert variant="success" titulo="Expediente encerrado">
              <p>{resultadoEncerramento.mensagem}</p>
              <p className="mt-1 text-xs tabular-nums">
                Descartadas: <strong>{resultadoEncerramento.total_descartadas}</strong>{' '}
                | Em atendimento mantidas:{' '}
                <strong>{resultadoEncerramento.total_em_atendimento_mantidas}</strong>
              </p>
            </Alert>
          )}

          {confirmandoEncerramento ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 animate-fade-in">
              <div className="flex items-start gap-2.5 text-sm text-amber-100">
                <ShieldAlert aria-hidden="true" className="h-5 w-5 shrink-0 mt-0.5" />
                <p>
                  Confirma o descarte de todas as senhas em{' '}
                  <strong>AGUARDANDO</strong> de hoje? Essa ação fica registrada
                  na auditoria.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={encerrando}
                  onClick={() => setConfirmandoEncerramento(false)}
                >
                  <span>Cancelar</span>
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full sm:w-auto"
                  carregando={encerrando}
                  textoCarregando="Encerrando..."
                  onClick={() => void handleEncerrarExpediente()}
                >
                  <span>Confirmar encerramento</span>
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setConfirmandoEncerramento(true)}
            >
              <Power aria-hidden="true" className="h-4 w-4 text-amber-300" />
              <span>Executar encerramento de expediente</span>
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}