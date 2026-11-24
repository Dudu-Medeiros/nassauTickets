import type { Guiche, ResumoAtendimento, Senha } from '../types'
import { api } from './api'

export type AcaoAtendimento =
  | 'rechamar'
  | 'iniciar'
  | 'finalizar'
  | 'nao-compareceu'

export async function listarGuichesAtivos(): Promise<Guiche[]> {
  const { data } = await api.get<Guiche[]>('/guiches', {
    params: { ativo: true },
  })
  return data
}

export async function obterResumoAtendimento(): Promise<ResumoAtendimento> {
  const { data } = await api.get<ResumoAtendimento>('/atendimento/atual')
  return data
}

export async function chamarProximaSenha(guicheId: number): Promise<Senha> {
  const { data } = await api.post<Senha>('/atendimento/chamar', {
    guiche_id: guicheId,
  })
  return data
}

export async function executarAcaoSenha(
  senhaId: number,
  acao: AcaoAtendimento,
): Promise<Senha> {
  const { data } = await api.post<Senha>(
    `/atendimento/senhas/${senhaId}/${acao}`,
  )
  return data
}