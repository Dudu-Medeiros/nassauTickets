import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from './ui'
import { useAuth } from '../hooks/useAuth'

interface Props {
  /** exige perfil de Gestor */
  somenteGestor?: boolean
}

export function ProtectedRoute({ somenteGestor = false }: Props) {
  const { autenticado, carregando, ehGestor } = useAuth()
  const location = useLocation()

  if (carregando) return <Spinner rotulo="Verificando sessão…" />
  if (!autenticado) return <Navigate to="/login" replace state={{ de: location.pathname }} />
  if (somenteGestor && !ehGestor) return <Navigate to="/atendente" replace />

  return <Outlet />
}
