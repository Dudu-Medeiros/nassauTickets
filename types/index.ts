/** Tipos compartilhados — espelham os modelos/rotas do backend Flask. */

export const TIPOS_SENHA = ['SP', 'SE', 'SG'] as const
export type TipoSenha = (typeof TIPOS_SENHA)[number]

export const ROTULOS_TIPO_SENHA: Record<TipoSenha, string> = {
  SP: 'Prioritária',
  SE: 'Exames',
  SG: 'Geral',
}

/** Os 7 estados de uma senha (backend/app/models/enums.py). */
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

/** Transições permitidas (utils/maquina_estados.py). */
export const TRANSICOES_PERMITIDAS: Record<StatusSenha, readonly StatusSenha[]> = {
  EMITIDA: ['AGUARDANDO'],
  AGUARDANDO: ['CHAMADA'],
  CHAMADA: ['CHAMADA NOVAMENTE', 'EM_ATENDIMENTO'],
  'CHAMADA NOVAMENTE': ['EM_ATENDIMENTO', 'NÃO_COMPARECEU'],
  EM_ATENDIMENTO: ['ATENDIDA'],
  ATENDIDA: [],
  NÃO_COMPARECEU: [],
}

export interface Senha {
  id: number
  codigo: string
  tipo: TipoSenha
  sequencial: number
  data_referencia: string
  status: StatusSenha
  emitida_em: string | null
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

export interface LoginPayload {
  email: string
  senha: string
}

export interface LoginResponse {
  access_token: string
  usuario: Usuario
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

export interface PainelChamados {
  chamada_atual: ChamadoPainel | null
  chamados: ChamadoPainel[]
  total: number
  atualizado_em: string
}

export interface HistoricoSenha {
  [campo: string]: unknown
}

export interface ConsultaSenha {
  senha: Senha
  historico: HistoricoSenha[]
}

/** Corpo padrão de erro do backend: { erro: string, ...extras } */
export interface ErroApi {
  erro: string
  [extra: string]: unknown
}

export interface ResumoAtendimento {
  senha_atual: Senha | null
  fila_aguardando: { SP: number; SE: number; SG: number; total: number }
  ultima_prioridade_chamada: TipoSenha | null
  proxima_ordem_prioridade: TipoSenha[]
  tempo_limite_abandono_segundos: number
  expediente: StatusExpediente
}
