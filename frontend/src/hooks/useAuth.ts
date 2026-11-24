import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext'

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.')
  }
  return contexto
}