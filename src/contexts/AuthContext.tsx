import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { registrarAoExpirarSessao } from '../services/api'
import * as authService from '../services/authService'
import { tokenStorage } from '../services/storage'
import type { LoginPayload, Usuario } from '../types'

export interface AuthContextValue {
  usuario: Usuario | null
  /** true enquanto valida o token salvo ao abrir o app */
  carregando: boolean
  autenticado: boolean
  ehGestor: boolean
  entrar: (payload: LoginPayload) => Promise<Usuario>
  sair: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState<boolean>(() => tokenStorage.get() !== null)

  const sair = useCallback(() => {
    tokenStorage.clear()
    setUsuario(null)
  }, [])

  // Sessão expirada (401) em qualquer requisição → desloga.
  useEffect(() => {
    registrarAoExpirarSessao(sair)
    return () => registrarAoExpirarSessao(null)
  }, [sair])

  // Restaura a sessão a partir do token salvo.
  useEffect(() => {
    if (!tokenStorage.get()) return
    let ativo = true
    authService
      .obterUsuarioAtual()
      .then((u) => ativo && setUsuario(u))
      .catch(() => ativo && sair())
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [sair])

  const entrar = useCallback(async (payload: LoginPayload) => {
    const { access_token, usuario: u } = await authService.login(payload)
    tokenStorage.set(access_token)
    setUsuario(u)
    return u
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      carregando,
      autenticado: usuario !== null,
      ehGestor: usuario?.eh_gestor ?? false,
      entrar,
      sair,
    }),
    [usuario, carregando, entrar, sair],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
