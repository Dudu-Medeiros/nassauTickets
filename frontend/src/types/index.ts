export const TIPOS_SENHA = {
  SP: 'SP',
  SE: 'SE',
  SG: 'SG',
} as const

export type TipoSenha = (typeof TIPOS_SENHA)[keyof typeof TIPOS_SENHA]

export const STATUS_SENHA = {
  EMITIDA: 'EMITIDA',
  AGUARDANDO: 'AGUARDANDO',
  CHAMADA: 'CHAMADA',
  CHAMADA_NOVAMENTE: 'CHAMADA NOVAMENTE',
  EM_ATENDIMENTO: 'EM_ATENDIMENTO',
  ATENDIDA: 'ATENDIDA',
  NAO_COMPARECEU: 'NÃO_COMPARECEU',
} as const

export type StatusSenha = (typeof STATUS_SENHA)[keyof typeof STATUS_SENHA]

export const ROTULOS_TIPO_SENHA: Record<TipoSenha, string> = {
  SP: 'Prioritária',
  SE: 'Exames',
  SG: 'Geral',
}

export const ROTULOS_STATUS_SENHA: Record<StatusSenha, string> = {
  EMITIDA: 'Emitida',
  AGUARDANDO: 'Aguardando',
  CHAMADA: 'Chamada (1ª)',
  'CHAMADA NOVAMENTE': 'Chamada Novamente (2ª)',
  EM_ATENDIMENTO: 'Em Atendimento',
  ATENDIDA: 'Atendida',
  'NÃO_COMPARECEU': 'Não Compareceu',
}

export interface Usuario {
  id: number
  nome: string
  email: string
  eh_gestor: boolean
  ativo: boolean
  criado_em: string
}

export interface Guiche {
  id: number
  numero: number
  nome: string
  ativo: boolean
  criado_em: string
}

export interface Senha {
  id: number
  codigo: string
  tipo: TipoSenha
  sequencial: number
  data_referencia: string
  status: StatusSenha
  emitida_em: string
  primeira_chamada_em: string | null
  segunda_chamada_em: string | null
  inicio_atendimento_em: string | null
  fim_atendimento_em: string | null
  tempo_atendimento_segundos: number | null
  descartada_fim_expediente: boolean
  guiche_id: number | null
  guiche_nome: string | null
  guiche_numero: number | null
  atendente_id: number | null
  atendente_nome: string | null
}

export interface StatusExpediente {
  aberto: boolean
  dentro_horario_oficial: boolean
  apos_fim_expediente: boolean
  modo_demo: boolean
  expediente_inicio: string
  expediente_fim: string
  horario_atual: string
}

export interface LoginPayload {
  email: string
  senha: string
}

export interface LoginResponse {
  access_token: string
  usuario: Usuario
}

export interface ApiErrorBody {
  erro?: string
}

export interface ChamadoPainel {
  id: number
  codigo: string
  tipo: TipoSenha
  prioridade_label: string
  status: StatusSenha
  guiche_numero: number | null
  guiche_nome: string | null
  numero_chamada: 1 | 2
  eh_segunda_chamada: boolean
  rotulo_chamada: string
  chamada_em: string | null
}

export interface RespostaPainelChamados {
  chamada_atual: ChamadoPainel | null
  chamados: ChamadoPainel[]
  total: number
  atualizado_em: string
}

export interface FilaAguardando {
  SP: number
  SE: number
  SG: number
  total: number
}

export interface RotinasExecutadas {
  abandonos_automaticos: string[]
  total_abandonos_automaticos: number
  encerramento_automatico_expediente: {
    executado: boolean
    total_descartadas: number
    codigos_descartados: string[]
  }
}

export interface ResumoAtendimento {
  senha_atual: Senha | null
  fila_aguardando: FilaAguardando
  ultima_prioridade_chamada: TipoSenha | null
  proxima_ordem_prioridade: TipoSenha[]
  tempo_limite_abandono_segundos: number
  expediente: StatusExpediente
  rotinas_executadas: RotinasExecutadas
}

export type TipoPeriodoRelatorio = 'diario' | 'mensal'

export interface FiltroPeriodoPayload {
  periodo: TipoPeriodoRelatorio
  data?: string
  mes?: string
}

export interface FiltroPeriodoResposta {
  periodo: TipoPeriodoRelatorio
  referencia: string
  data_inicio: string
  data_fim: string
}

export interface BlocoQuantitativo {
  emitidas: number
  atendidas: number
  nao_compareceu: number
  descartadas_fim_expediente: number
  em_aberto: number
  taxa_atendimento_percentual: number
  taxa_nao_comparecimento_percentual: number
}

export interface RelatorioQuantitativo {
  filtro: FiltroPeriodoResposta
  geral: BlocoQuantitativo
  por_prioridade: Record<TipoSenha, BlocoQuantitativo>
  gerado_em: string
}

export interface MetricasTempoMedio {
  total_atendidas: number
  tm_segundos: number | null
  tm_minutos: number | null
  tm_formatado: string | null
  menor_tempo_segundos: number | null
  maior_tempo_segundos: number | null
  tme_segundos: number | null
  tme_minutos: number | null
  tme_formatado: string | null
}

export interface RelatorioTempoMedio {
  filtro: FiltroPeriodoResposta
  geral: MetricasTempoMedio
  por_prioridade: Record<TipoSenha, MetricasTempoMedio>
  gerado_em: string
}

export interface ItemRelatorioDetalhado {
  id: number
  codigo: string
  tipo: TipoSenha
  data_referencia: string
  status: StatusSenha
  descartada_fim_expediente: boolean
  emitida_em: string | null
  primeira_chamada_em: string | null
  segunda_chamada_em: string | null
  inicio_atendimento_em: string | null
  fim_atendimento_em: string | null
  tempo_atendimento_segundos: number | null
  tempo_atendimento_formatado: string | null
  guiche_id: number | null
  guiche_numero: number | null
  guiche_nome: string | null
  atendente_id: number | null
  atendente_nome: string | null
}

export interface RelatorioDetalhado {
  filtro: FiltroPeriodoResposta
  total: number
  itens: ItemRelatorioDetalhado[]
  gerado_em: string
}

export interface EventoAuditoria {
  id: number
  senha_id: number | null
  senha_codigo?: string | null
  atendente_id: number | null
  atendente_nome?: string | null
  guiche_id: number | null
  guiche_nome?: string | null
  status_anterior: string | null
  status_novo: string | null
  acao: string
  detalhes: string | null
  criado_em: string
}

export interface RelatorioAuditoria {
  filtro: FiltroPeriodoResposta
  total_eventos: number
  resumo_por_acao: Record<string, number>
  eventos: EventoAuditoria[]
  gerado_em: string
}

export interface DesempenhoGrupo {
  total_chamadas: number
  atendidas: number
  nao_compareceu: number
  em_andamento: number
  taxa_conclusao_percentual: number
  tm_segundos: number | null
  tm_minutos: number | null
  tm_formatado: string | null
  por_tipo_atendidas: Record<TipoSenha, number>
}

export interface DesempenhoAtendente extends DesempenhoGrupo {
  atendente_id: number
  atendente_nome: string
  email: string
  eh_gestor: boolean
  ativo: boolean
}

export interface DesempenhoGuiche extends DesempenhoGrupo {
  guiche_id: number
  guiche_numero: number
  guiche_nome: string
  ativo: boolean
}

export interface RelatorioDesempenho {
  filtro: FiltroPeriodoResposta
  por_atendente: DesempenhoAtendente[]
  por_guiche: DesempenhoGuiche[]
  gerado_em: string
}

export interface CriarUsuarioPayload {
  nome: string
  email: string
  senha: string
  eh_gestor?: boolean
}

export interface AtualizarUsuarioPayload {
  nome?: string
  email?: string
  senha?: string
  eh_gestor?: boolean
  ativo?: boolean
}

export interface CriarGuichePayload {
  numero: number
  nome?: string
}

export interface AtualizarGuichePayload {
  numero?: number
  nome?: string
  ativo?: boolean
}

export interface ResultadoEncerramentoExpediente {
  mensagem: string
  total_descartadas: number
  codigos_descartados: string[]
  total_em_atendimento_mantidas: number
  codigos_em_atendimento_mantidas: string[]
  total_chamadas_em_aberto: number
  codigos_chamadas_em_aberto: string[]
}