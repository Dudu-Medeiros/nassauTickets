import type { LoginPayload, LoginResponse, Usuario } from '../types'
import { api } from './api'

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)
  return data
}

export async function obterUsuarioAtual(): Promise<Usuario> {
  const { data } = await api.get<{ usuario: Usuario }>('/auth/me')
  return data.usuario
}
