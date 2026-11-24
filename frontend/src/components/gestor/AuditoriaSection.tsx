import { Download, FileSpreadsheet, Search } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { extrairMensagemErro } from '../../services/api'
import { obterRelatorioAuditoria } from '../../services/gestorService'
import type { FiltroPeriodoPayload, RelatorioAuditoria } from '../../types'
import { exportarCsv, exportarJson } from '../../utils/exportarArquivo'
import { Alert, Badge, Button, Card, Spinner } from '../ui'

interface AuditoriaSectionProps {
  filtroPeriodo: FiltroPeriodoPayload
  chaveAtualizacao: number
}

const ACOES_AUDITORIA = [
  'EMISSAO',
  'ENTRADA_FILA',
  'PRIMEIRA_CHAMADA',
  'SEGUNDA_CHAMADA',
  'INICIO_ATENDIMENTO',
  'FINALIZACAO_ATENDIMENTO',
  'NAO_COMPARECEU',
  'ABANDONO_AUTOMATICO',
  'DESCARTE_FIM_EXPEDIENTE',
  'DESCARTE_AUTOMATICO_17H',
]

function formatarDataHora(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return iso
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

export function AuditoriaSection({
  filtroPeriodo,
  chaveAtualizacao,
}: AuditoriaSectionProps) {
  const [acaoFiltro, setAcaoFiltro] = useState('')
  const [codigoInput, setCodigoInput] = useState('')
  const [codigoAplicado, setCodigoAplicado] = useState('')
  const [relatorio, setRelatorio] = useState<RelatorioAuditoria | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await obterRelatorioAuditoria(filtroPeriodo, {
        acao: acaoFiltro || undefined,
        senha_codigo: codigoAplicado || undefined,
      })
      setRelatorio(dados)
    } catch (falha) {
      setErro(
        extrairMensagemErro(falha, 'Falha ao carregar relatório de auditoria.'),
      )
    } finally {
      setCarregando(false)
    }
  }, [filtroPeriodo, acaoFiltro, codigoAplicado])

  useEffect(() => {
    void carregar()
  }, [carregar, chaveAtualizacao])

  const handleBuscarCodigo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCodigoAplicado(codigoInput.trim().toUpperCase())
  }

  const handleExportarCsv = () => {
    if (!relatorio) return
    exportarCsv(
      `relatorio-auditoria-${relatorio.filtro.referencia}.csv`,
      [
        'ID',
        'Data/Hora',
        'Ação',
        'Senha',
        'Status Anterior',
        'Status Novo',
        'Atendente',
        'Guichê',
        'Detalhes',
      ],
      relatorio.eventos.map((ev) => [
        ev.id,
        ev.criado_em,
        ev.acao,
        ev.senha_codigo ?? (ev.senha_id ? `#${ev.senha_id}` : ''),
        ev.status_anterior ?? '',
        ev.status_novo ?? '',
        ev.atendente_nome ?? (ev.atendente_id ? `#${ev.atendente_id}` : ''),
        ev.guiche_nome ?? (ev.guiche_id ? `#${ev.guiche_id}` : ''),
        ev.detalhes ?? '',
      ]),
    )
  }

  const resumoAcoes = Object.entries(relatorio?.resumo_por_acao ?? {}).sort(
    (a, b) => b[1] - a[1],
  )

  return (
    <Card
      titulo="Trilha de Auditoria"
      subtitulo="Registro cronológico imutável de emissões, chamadas, atendimentos, abandonos e encerramentos."
      acao={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!relatorio || relatorio.eventos.length === 0}
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
                `relatorio-auditoria-${relatorio.filtro.referencia}.json`,
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
          <div>
            <label
              htmlFor="auditoria-acao"
              className="block text-xs text-slate-400 mb-1"
            >
              Ação
            </label>
            <select
              id="auditoria-acao"
              value={acaoFiltro}
              onChange={(e) => setAcaoFiltro(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <option value="">Todas as ações</option>
              {ACOES_AUDITORIA.map((acao) => (
                <option key={acao} value={acao}>
                  {acao}
                </option>
              ))}
            </select>
          </div>

          <form
            onSubmit={handleBuscarCodigo}
            className="flex flex-wrap items-end gap-2"
          >
            <div>
              <label
                htmlFor="auditoria-codigo"
                className="block text-xs text-slate-400 mb-1"
              >
                Código da senha
              </label>
              <input
                id="auditoria-codigo"
                type="text"
                placeholder="Ex: 261124-SP001"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              <Search aria-hidden="true" className="h-4 w-4" />
              Buscar
            </Button>
          </form>

          {(acaoFiltro || codigoAplicado) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAcaoFiltro('')
                setCodigoInput('')
                setCodigoAplicado('')
              }}
            >
              Limpar
            </Button>
          )}

          {relatorio && (
            <span className="ml-auto text-xs text-slate-400 self-center">
              Eventos:{' '}
              <strong className="text-slate-100">
                {relatorio.total_eventos}
              </strong>
            </span>
          )}
        </div>

        {resumoAcoes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {resumoAcoes.map(([acao, total]) => (
              <button
                key={acao}
                type="button"
                onClick={() =>
                  setAcaoFiltro((atual) => (atual === acao ? '' : acao))
                }
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-full"
              >
                <Badge tone={acaoFiltro === acao ? 'sky' : 'neutral'}>
                  {acao}: {total}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {erro && (
          <Alert variant="error" titulo="Erro ao consultar auditoria">
            {erro}
          </Alert>
        )}

        {carregando ? (
          <div className="py-10 flex justify-center">
            <Spinner tamanho="md" rotulo="Carregando trilha de auditoria..." />
          </div>
        ) : !relatorio || relatorio.eventos.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Nenhum evento de auditoria encontrado no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-3">Data / Hora</th>
                  <th className="py-3 px-3">Ação</th>
                  <th className="py-3 px-3">Transição</th>
                  <th className="py-3 px-3">Atendente / Guichê</th>
                  <th className="py-3 pl-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {relatorio.eventos.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/30">
                    <td className="py-3 pr-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {formatarDataHora(ev.criado_em)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <Badge
                        tone={
                          ev.acao.includes('ABANDONO') ||
                          ev.acao === 'NAO_COMPARECEU'
                            ? 'rose'
                            : ev.acao.includes('DESCARTE')
                              ? 'amber'
                              : ev.acao === 'FINALIZACAO_ATENDIMENTO'
                                ? 'emerald'
                                : 'sky'
                        }
                      >
                        {ev.acao}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {ev.status_anterior ?? '—'} → {ev.status_novo ?? '—'}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-300 whitespace-nowrap">
                      {[
                        ev.atendente_nome ??
                          (ev.atendente_id ? `AA #${ev.atendente_id}` : null),
                        ev.guiche_nome ??
                          (ev.guiche_id ? `Guichê #${ev.guiche_id}` : null),
                      ]
                        .filter(Boolean)
                        .join(' • ') || 'Sistema'}
                    </td>
                    <td className="py-3 pl-3 text-xs text-slate-300 max-w-md">
                      {ev.detalhes ?? '—'}
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