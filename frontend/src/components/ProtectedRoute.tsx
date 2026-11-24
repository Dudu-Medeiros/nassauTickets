import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from './ui'

interface ProtectedRouteProps {
  somenteGestor?: boolean
}

export function ProtectedRoute({ somenteGestor = false }: ProtectedRouteProps) {
  const { usuario, carregando, autenticado } = useAuth()
  const location = useLocation()

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <Spinner tamanho="lg" rotulo="Verificando sessão..." />
      </div>
    )
  }

  if (!autenticado || !usuario) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (somenteGestor && !usuario.eh_gestor) {
    return <Navigate to="/atendente" replace />
  }

  return <Outlet />
}