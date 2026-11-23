import type { Guiche, ResumoAtendimento, Senha } from '../types'
import { api } from './api'

export async function listarGuichesAtivos(): Promise<Guiche[]> {
  const { data } = await api.get<Guiche[]>('/guiches', { params: { ativo: true } })
  return data
}

export async function obterResumo(): Promise<ResumoAtendimento> {
  const { data } = await api.get<ResumoAtendimento>('/atendimento/atual')
  return data
}

export async function chamarProximo(guicheId: number): Promise<Senha> {
  const { data } = await api.post<Senha>('/atendimento/chamar', { guiche_id: guicheId })
  return data
}

export type AcaoSenha = 'rechamar' | 'iniciar' | 'finalizar' | 'nao-compareceu'

export async function executarAcao(acao: AcaoSenha, senhaId: number): Promise<Senha> {
  const { data } = await api.post<Senha>(`/atendimento/senhas/${senhaId}/${acao}`)
  return data
}
