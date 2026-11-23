import axios, { AxiosError } from 'axios'
import type { ErroApi } from '../types'
import { tokenStorage } from './storage'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
})

// Anexa o JWT em toda requisição.
api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type AoExpirarSessao = () => void
let aoExpirarSessao: AoExpirarSessao | null = null

/** O AuthProvider registra aqui o que fazer quando a API responder 401. */
export function registrarAoExpirarSessao(fn: AoExpirarSessao | null): void {
  aoExpirarSessao = fn
}

api.interceptors.response.use(
  (resposta) => resposta,
  (erro: AxiosError<ErroApi>) => {
    const url = erro.config?.url ?? ''
    // 401 no próprio login significa credenciais inválidas, não sessão expirada.
    if (erro.response?.status === 401 && !url.includes('/auth/login')) {
      tokenStorage.clear()
      aoExpirarSessao?.()
    }
    return Promise.reject(erro)
  },
)

/** Extrai uma mensagem amigável de qualquer erro de requisição. */
export function mensagemDeErro(erro: unknown): string {
  if (axios.isAxiosError<ErroApi>(erro)) {
    if (erro.response?.data?.erro) return erro.response.data.erro
    if (!erro.response) return 'Não foi possível conectar ao servidor.'
  }
  return 'Ocorreu um erro inesperado.'
}
