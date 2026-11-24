import { Download, FileSpreadsheet, Filter } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { extrairMensagemErro } from '../../services/api'
import { obterRelatorioDetalhado } from '../../services/gestorService'
import {
  ROTULOS_STATUS_SENHA,
  STATUS_SENHA,
  TIPOS_SENHA,
  type FiltroPeriodoPayload,
  type RelatorioDetalhado,
  type StatusSenha,
  type TipoSenha,
} from '../../types'
import { exportarCsv, exportarJson } from '../../utils/exportarArquivo'
import { Alert, Badge, Button, Card, Spinner } from '../ui'

interface RelatorioDetalhadoSectionProps {
  filtroPeriodo: FiltroPeriodoPayload
  chaveAtualizacao: number
}

function formatarDataHora(iso: string | null): string {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return iso
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

function tomTipo(tipo: TipoSenha): 'amber' | 'sky' | 'emerald' {
  if (tipo === TIPOS_SENHA.SP) return 'amber'
  if (tipo === TIPOS_SENHA.SE) return 'sky'
  return 'emerald'
}

function tomStatus(status: StatusSenha): 'emerald' | 'rose' | 'amber' | 'sky' | 'neutral' {
  switch (status) {
    case STATUS_SENHA.ATENDIDA:
      return 'emerald'
    case STATUS_SENHA.NAO_COMPARECEU:
      return 'rose'
    case STATUS_SENHA.CHAMADA_NOVAMENTE:
      return 'amber'
    case STATUS_SENHA.CHAMADA:
    case STATUS_SENHA.EM_ATENDIMENTO:
      return 'sky'
    default:
      return 'neutral'
  }
}

export function RelatorioDetalhadoSection({
  filtroPeriodo,
  chaveAtualizacao,
}: RelatorioDetalhadoSectionProps) {
  const [tipoFiltro, setTipoFiltro] = useState<TipoSenha | ''>('')
  const [statusFiltro, setStatusFiltro] = useState<StatusSenha | ''>('')
  const [relatorio, setRelatorio] = useState<RelatorioDetalhado | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await obterRelatorioDetalhado(filtroPeriodo, {
        tipo: tipoFiltro,
        status: statusFiltro,
      })
      setRelatorio(dados)
    } catch (falha) {
      setErro(extrairMensagemErro(falha, 'Falha ao carregar relatório detalhado.'))
    } finally {
      setCarregando(false)
    }
  }, [filtroPeriodo, tipoFiltro, statusFiltro])

  useEffect(() => {
    void carregar()
  }, [carregar, chaveAtualizacao])

  const handleExportarCsv = () => {
    if (!relatorio) return
    exportarCsv(
      `relatorio-detalhado-${relatorio.filtro.referencia}.csv`,
      [
        'Código',
        'Tipo',
        'Status',
        'Descartada (17h)',
        'Emitida em',
        'Início Atendimento',
        'Fim Atendimento',
        'Duração',
        'Guichê',
        'Atendente',
      ],
      relatorio.itens.map((item) => [
        item.codigo,
        item.tipo,
        item.status,
        item.descartada_fim_expediente ? 'Sim' : 'Não',
        item.emitida_em ?? '',
        item.inicio_atendimento_em ?? '',
        item.fim_atendimento_em ?? '',
        item.tempo_atendimento_formatado ?? '',
        item.guiche_nome ?? '',
        item.atendente_nome ?? '',
      ]),
    )
  }

  return (
    <Card
      titulo="Relatório Detalhado de Senhas"
      subtitulo="Senhas não atendidas mantêm os campos de atendimento (início, fim, duração, guichê e atendente) vazios."
      acao={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!relatorio || relatorio.itens.length === 0}
            onClick={handleExportarCsv}
          >
            <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!relatorio}
            onClick={() =>
              relatorio &&
              exportarJson(
                `relatorio-detalhado-${relatorio.filtro.referencia}.json`,
                relatorio,
              )
            }
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            JSON
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1 self-center">
            <Filter aria-hidden="true" className="h-3.5 w-3.5" />
            Filtros
          </div>

          <div>
            <label
              htmlFor="detalhado-tipo"
              className="block text-xs text-slate-400 mb-1"
            >
              Prioridade
            </label>
            <select
              id="detalhado-tipo"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as TipoSenha | '')}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <option value="">Todas</option>
              <option value="SP">SP — Prioritária</option>
              <option value="SE">SE — Exames</option>
              <option value="SG">SG — Geral</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="detalhado-status"
              className="block text-xs text-slate-400 mb-1"
            >
              Status
            </label>
            <select
              id="detalhado-status"
              value={statusFiltro}
              onChange={(e) =>
                setStatusFiltro(e.target.value as StatusSenha | '')
              }
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <option value="">Todos</option>
              {Object.values(STATUS_SENHA).map((st) => (
                <option key={st} value={st}>
                  {ROTULOS_STATUS_SENHA[st]}
                </option>
              ))}
            </select>
          </div>

          {(tipoFiltro || statusFiltro) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTipoFiltro('')
                setStatusFiltro('')
              }}
            >
              Limpar filtros
            </Button>
          )}

          {relatorio && (
            <span className="ml-auto text-xs text-slate-400 self-center">
              Total listado:{' '}
              <strong className="text-slate-100">{relatorio.total}</strong>
            </span>
          )}
        </div>

        {erro && (
          <Alert variant="error" titulo="Erro ao consultar relatório">
            {erro}
          </Alert>
        )}

        {carregando ? (
          <div className="py-10 flex justify-center">
            <Spinner tamanho="md" rotulo="Carregando relatório detalhado..." />
          </div>
        ) : !relatorio || relatorio.itens.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Nenhuma senha encontrada com os filtros aplicados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-3">Código</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Emissão</th>
                  <th className="py-3 px-3">Início</th>
                  <th className="py-3 px-3">Fim</th>
                  <th className="py-3 px-3 text-right">Duração</th>
                  <th className="py-3 px-3">Guichê</th>
                  <th className="py-3 pl-3">Atendente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {relatorio.itens.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="py-3 pr-3 font-mono font-semibold text-white whitespace-nowrap">
                      {item.codigo}
                    </td>
                    <td className="py-3 px-3">
                      <Badge tone={tomTipo(item.tipo)}>{item.tipo}</Badge>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge tone={tomStatus(item.status)}>
                          {ROTULOS_STATUS_SENHA[item.status]}
                        </Badge>
                        {item.descartada_fim_expediente && (
                          <Badge tone="amber">Descartada 17h</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {formatarDataHora(item.emitida_em)}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {formatarDataHora(item.inicio_atendimento_em)}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {formatarDataHora(item.fim_atendimento_em)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sky-300 whitespace-nowrap">
                      {item.tempo_atendimento_formatado ?? '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-200 whitespace-nowrap">
                      {item.guiche_nome ?? '—'}
                    </td>
                    <td className="py-3 pl-3 text-slate-200 whitespace-nowrap">
                      {item.atendente_nome ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  )
}