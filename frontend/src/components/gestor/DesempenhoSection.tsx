import { Download, FileSpreadsheet } from 'lucide-react'
import type { RelatorioDesempenho } from '../../types'
import { exportarCsv, exportarJson } from '../../utils/exportarArquivo'
import { Badge, Button, Card } from '../ui'

interface DesempenhoSectionProps {
  desempenho: RelatorioDesempenho | null
}

export function DesempenhoSection({ desempenho }: DesempenhoSectionProps) {
  if (!desempenho) {
    return (
      <Card>
        <p className="text-sm text-slate-400">
          Nenhum indicador de desempenho disponível para o período selecionado.
        </p>
      </Card>
    )
  }

  const maxAtendidasAtendente = Math.max(
    1,
    ...desempenho.por_atendente.map((a) => a.atendidas),
  )
  const maxAtendidasGuiche = Math.max(
    1,
    ...desempenho.por_guiche.map((g) => g.atendidas),
  )

  const exportarCsvAtendentes = () => {
    const ref = desempenho.filtro.referencia
    exportarCsv(
      `desempenho-atendentes-${ref}.csv`,
      [
        'Atendente',
        'E-mail',
        'Perfil',
        'Ativo',
        'Chamadas',
        'Atendidas',
        'Não Compareceu',
        'SP',
        'SE',
        'SG',
        'Conclusão (%)',
        'TM',
      ],
      desempenho.por_atendente.map((a) => [
        a.atendente_nome,
        a.email,
        a.eh_gestor ? 'Gestor' : 'Atendente',
        a.ativo ? 'Sim' : 'Não',
        a.total_chamadas,
        a.atendidas,
        a.nao_compareceu,
        a.por_tipo_atendidas.SP,
        a.por_tipo_atendidas.SE,
        a.por_tipo_atendidas.SG,
        a.taxa_conclusao_percentual,
        a.tm_formatado ?? '-',
      ]),
    )
  }

  const exportarCsvGuiches = () => {
    const ref = desempenho.filtro.referencia
    exportarCsv(
      `desempenho-guiches-${ref}.csv`,
      [
        'Número',
        'Guichê',
        'Ativo',
        'Chamadas',
        'Atendidas',
        'Não Compareceu',
        'SP',
        'SE',
        'SG',
        'Conclusão (%)',
        'TM',
      ],
      desempenho.por_guiche.map((g) => [
        g.guiche_numero,
        g.guiche_nome,
        g.ativo ? 'Sim' : 'Não',
        g.total_chamadas,
        g.atendidas,
        g.nao_compareceu,
        g.por_tipo_atendidas.SP,
        g.por_tipo_atendidas.SE,
        g.por_tipo_atendidas.SG,
        g.taxa_conclusao_percentual,
        g.tm_formatado ?? '-',
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <Card
        titulo="Desempenho por Atendente"
        subtitulo="Produtividade, taxa de conclusão e Tempo Médio individual no período."
        acao={
          <>
            <Button variant="secondary" size="sm" onClick={exportarCsvAtendentes}>
              <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
              <span>CSV</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                exportarJson(
                  `desempenho-${desempenho.filtro.referencia}.json`,
                  desempenho,
                )
              }
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              <span>JSON</span>
            </Button>
          </>
        }
      >
        {desempenho.por_atendente.length === 0 ? (
          <p className="text-sm text-slate-400">
            Sem atendimentos registrados para atendentes neste período.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Atendente</th>
                  <th className="py-3 px-3 text-right">Chamadas</th>
                  <th className="py-3 px-3 text-right">Atendidas</th>
                  <th className="py-3 px-3 text-right">Ausências</th>
                  <th className="py-3 px-3">SP / SE / SG</th>
                  <th className="py-3 px-3 text-right">Conclusão</th>
                  <th className="py-3 pl-3 text-right">TM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {desempenho.por_atendente.map((item) => {
                  const larguraBarra = Math.round(
                    (item.atendidas / maxAtendidasAtendente) * 100,
                  )

                  return (
                    <tr
                      key={item.atendente_id}
                      className="transition-colors duration-150 hover:bg-slate-800/40"
                    >
                      <td className="py-3.5 pr-4 min-w-[200px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-100">
                            {item.atendente_nome}
                          </span>
                          {item.eh_gestor && <Badge tone="violet">Gestor</Badge>}
                          {!item.ativo && <Badge tone="neutral">Inativo</Badge>}
                        </div>
                        <div className="mt-2 h-1.5 w-36 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-400 transition-all duration-500"
                            style={{ width: `${larguraBarra}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right tabular-nums text-slate-300">
                        {item.total_chamadas}
                      </td>
                      <td className="py-3.5 px-3 text-right tabular-nums font-semibold text-emerald-300">
                        {item.atendidas}
                      </td>
                      <td className="py-3.5 px-3 text-right tabular-nums text-rose-300">
                        {item.nao_compareceu}
                      </td>
                      <td className="py-3.5 px-3 tabular-nums text-xs text-slate-300 whitespace-nowrap">
                        <span className="text-amber-300 font-medium">
                          {item.por_tipo_atendidas.SP}
                        </span>
                        {' / '}
                        <span className="text-sky-300 font-medium">
                          {item.por_tipo_atendidas.SE}
                        </span>
                        {' / '}
                        <span className="text-emerald-300 font-medium">
                          {item.por_tipo_atendidas.SG}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right tabular-nums text-slate-200">
                        {item.taxa_conclusao_percentual}%
                      </td>
                      <td className="py-3.5 pl-3 text-right tabular-nums font-medium text-sky-300">
                        {item.tm_formatado ?? '--:--'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        titulo="Desempenho por Guichê"
        subtitulo="Volume de atendimentos e Tempo Médio distribuído por guichê."
        acao={
          <Button variant="secondary" size="sm" onClick={exportarCsvGuiches}>
            <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
            <span>Exportar CSV</span>
          </Button>
        }
      >
        {desempenho.por_guiche.length === 0 ? (
          <p className="text-sm text-slate-400">
            Sem dados registrados para guichês neste período.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {desempenho.por_guiche.map((guiche) => {
              const larguraBarra = Math.round(
                (guiche.atendidas / maxAtendidasGuiche) * 100,
              )

              return (
                <div
                  key={guiche.guiche_id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {guiche.guiche_nome}
                      </p>
                      <p className="text-xs text-slate-400 tabular-nums">
                        Guichê nº {String(guiche.guiche_numero).padStart(2, '0')}
                      </p>
                    </div>
                    <Badge tone={guiche.ativo ? 'emerald' : 'neutral'}>
                      {guiche.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${larguraBarra}%` }}
                    />
                  </div>

                  <dl className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <dt className="text-slate-500">Atendidas</dt>
                      <dd className="tabular-nums text-base font-bold text-emerald-300">
                        {guiche.atendidas}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Ausências</dt>
                      <dd className="tabular-nums text-base font-bold text-rose-300">
                        {guiche.nao_compareceu}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">TM</dt>
                      <dd className="tabular-nums text-base font-bold text-sky-300">
                        {guiche.tm_formatado ?? '--:--'}
                      </dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}