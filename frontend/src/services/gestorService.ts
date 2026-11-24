import type {
  AtualizarGuichePayload,
  AtualizarUsuarioPayload,
  CriarGuichePayload,
  CriarUsuarioPayload,
  FiltroPeriodoPayload,
  Guiche,
  RelatorioAuditoria,
  RelatorioDesempenho,
  RelatorioDetalhado,
  RelatorioQuantitativo,
  RelatorioTempoMedio,
  ResultadoEncerramentoExpediente,
  StatusSenha,
  TipoSenha,
  Usuario,
} from '../types'
import { api } from './api'

function montarParamsPeriodo(filtro: FiltroPeriodoPayload): Record<string, string> {
  const params: Record<string, string> = { periodo: filtro.periodo }
  if (filtro.periodo === 'diario' && filtro.data) {
    params.data = filtro.data
  }
  if (filtro.periodo === 'mensal' && filtro.mes) {
    params.mes = filtro.mes
  }
  return params
}

export async function obterRelatorioQuantitativo(
  filtro: FiltroPeriodoPayload,
): Promise<RelatorioQuantitativo> {
  const { data } = await api.get<RelatorioQuantitativo>(
    '/relatorios/quantitativo',
    { params: montarParamsPeriodo(filtro) },
  )
  return data
}

export async function obterRelatorioTempoMedio(
  filtro: FiltroPeriodoPayload,
): Promise<RelatorioTempoMedio> {
  const { data } = await api.get<RelatorioTempoMedio>(
    '/relatorios/tempo-medio',
    { params: montarParamsPeriodo(filtro) },
  )
  return data
}

export async function obterRelatorioDetalhado(
  filtro: FiltroPeriodoPayload,
  extras?: { tipo?: TipoSenha | ''; status?: StatusSenha | '' },
): Promise<RelatorioDetalhado> {
  const params: Record<string, string> = montarParamsPeriodo(filtro)
  if (extras?.tipo) params.tipo = extras.tipo
  if (extras?.status) params.status = extras.status

  const { data } = await api.get<RelatorioDetalhado>('/relatorios/detalhado', {
    params,
  })
  return data
}

export async function obterRelatorioAuditoria(
  filtro: FiltroPeriodoPayload,
  extras?: {
    acao?: string
    senha_codigo?: string
    atendente_id?: number
    guiche_id?: number
  },
): Promise<RelatorioAuditoria> {
  const params: Record<string, string | number> = montarParamsPeriodo(filtro)
  if (extras?.acao) params.acao = extras.acao
  if (extras?.senha_codigo) params.senha_codigo = extras.senha_codigo
  if (extras?.atendente_id) params.atendente_id = extras.atendente_id
  if (extras?.guiche_id) params.guiche_id = extras.guiche_id

  const { data } = await api.get<RelatorioAuditoria>('/relatorios/auditoria', {
    params,
  })
  return data
}

export async function obterRelatorioDesempenho(
  filtro: FiltroPeriodoPayload,
): Promise<RelatorioDesempenho> {
  const { data } = await api.get<RelatorioDesempenho>(
    '/relatorios/desempenho',
    { params: montarParamsPeriodo(filtro) },
  )
  return data
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data } = await api.get<Usuario[]>('/usuarios')
  return data
}

export async function criarUsuario(
  payload: CriarUsuarioPayload,
): Promise<Usuario> {
  const { data } = await api.post<Usuario>('/usuarios', payload)
  return data
}

export async function atualizarUsuario(
  usuarioId: number,
  payload: AtualizarUsuarioPayload,
): Promise<Usuario> {
  const { data } = await api.put<Usuario>(`/usuarios/${usuarioId}`, payload)
  return data
}

export async function desativarUsuario(usuarioId: number): Promise<Usuario> {
  const { data } = await api.delete<{ usuario: Usuario }>(
    `/usuarios/${usuarioId}`,
  )
  return data.usuario
}

export async function listarTodosGuiches(): Promise<Guiche[]> {
  const { data } = await api.get<Guiche[]>('/guiches')
  return data
}

export async function criarGuiche(payload: CriarGuichePayload): Promise<Guiche> {
  const { data } = await api.post<Guiche>('/guiches', payload)
  return data
}

export async function atualizarGuiche(
  guicheId: number,
  payload: AtualizarGuichePayload,
): Promise<Guiche> {
  const { data } = await api.put<Guiche>(`/guiches/${guicheId}`, payload)
  return data
}

export async function desativarGuiche(guicheId: number): Promise<Guiche> {
  const { data } = await api.delete<{ guiche: Guiche }>(`/guiches/${guicheId}`)
  return data.guiche
}

export async function encerrarExpedienteManual(): Promise<ResultadoEncerramentoExpediente> {
  const { data } = await api.post<ResultadoEncerramentoExpediente>(
    '/atendimento/encerrar-expediente',
  )
  return data
}