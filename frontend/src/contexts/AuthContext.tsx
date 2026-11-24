import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { EVENTO_SESSAO_EXPIRADA } from '../services/api'
import { login as loginRequest, obterPerfil } from '../services/authService'
import { obterToken, removerToken, salvarToken } from '../services/storage'
import type { LoginPayload, Usuario } from '../types'

export interface AuthContextValue {
  usuario: Usuario | null
  carregando: boolean
  autenticado: boolean
  ehGestor: boolean
  entrar: (payload: LoginPayload) => Promise<Usuario>
  sair: () => void
  recarregarPerfil: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState<boolean>(true)

  const sair = useCallback(() => {
    removerToken()
    setUsuario(null)
  }, [])

  const recarregarPerfil = useCallback(async () => {
    const token = obterToken()
    if (!token) {
      setUsuario(null)
      setCarregando(false)
      return
    }

    try {
      const perfil = await obterPerfil()
      setUsuario(perfil)
    } catch {
      removerToken()
      setUsuario(null)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void recarregarPerfil()
  }, [recarregarPerfil])

  useEffect(() => {
    const handleSessaoExpirada = () => {
      setUsuario(null)
    }

    window.addEventListener(EVENTO_SESSAO_EXPIRADA, handleSessaoExpirada)
    return () => {
      window.removeEventListener(EVENTO_SESSAO_EXPIRADA, handleSessaoExpirada)
    }
  }, [])

  const entrar = useCallback(async (payload: LoginPayload): Promise<Usuario> => {
    const resposta = await loginRequest(payload)
    salvarToken(resposta.access_token)
    setUsuario(resposta.usuario)
    return resposta.usuario
  }, [])

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      carregando,
      autenticado: usuario !== null,
      ehGestor: usuario?.eh_gestor ?? false,
      entrar,
      sair,
      recarregarPerfil,
    }),
    [usuario, carregando, entrar, sair, recarregarPerfil],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}