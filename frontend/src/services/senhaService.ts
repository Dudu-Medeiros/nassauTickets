import type { Senha, StatusExpediente, TipoSenha } from '../types'
import { api } from './api'

export async function obterStatusExpediente(): Promise<StatusExpediente> {
  const { data } = await api.get<StatusExpediente>('/senhas/expediente')
  return data
}

export async function emitirSenha(tipo: TipoSenha): Promise<Senha> {
  const { data } = await api.post<Senha>('/senhas', { tipo })
  return data
}