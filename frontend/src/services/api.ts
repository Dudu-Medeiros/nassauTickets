import axios, { type AxiosError } from 'axios'
import type { ApiErrorBody } from '../types'
import { obterToken, removerToken } from './storage'

export const EVENTO_SESSAO_EXPIRADA = 'nassautickets:sessao-expirada'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = obterToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''

    if (status === 401 && !url.includes('/auth/login')) {
      removerToken()
      window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA))
    }

    return Promise.reject(error)
  },
)

export function extrairMensagemErro(
  erro: unknown,
  fallback = 'Não foi possível concluir a solicitação.',
): string {
  if (axios.isAxiosError<ApiErrorBody>(erro)) {
    const mensagemApi = erro.response?.data?.erro
    if (mensagemApi) return mensagemApi
    if (!erro.response) {
      return 'Sem conexão com o servidor. Verifique se a API está em execução.'
    }
  }
  if (erro instanceof Error && erro.message) {
    return erro.message
  }
  return fallback
}