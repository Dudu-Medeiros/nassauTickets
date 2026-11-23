import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import AtendentePage from './pages/AtendentePage'
import GestorPage from './pages/GestorPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import PainelPage from './pages/PainelPage'
import TotemPage from './pages/TotemPage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* públicas */}
          <Route path="/" element={<TotemPage />} />
          <Route path="/painel" element={<PainelPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* atendente autenticado */}
          <Route element={<ProtectedRoute />}>
            <Route path="/atendente" element={<AtendentePage />} />
          </Route>

          {/* somente gestor */}
          <Route element={<ProtectedRoute somenteGestor />}>
            <Route path="/gestor" element={<GestorPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
