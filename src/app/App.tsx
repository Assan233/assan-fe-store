import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { AppShell } from '../components/AppShell'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../features/auth/LoginPage'
import { AccountPage } from '../features/account/AccountPage'

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-live="polite" aria-label="正在载入应用">
      <span className="loading-mark" aria-hidden="true">A</span>
      <span>正在准备你的应用库…</span>
    </main>
  )
}

function ProtectedApp() {
  const { user, status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <AppShell />
}

export function App() {
  const { user, status } = useAuth()
  if (status === 'loading') return <LoadingScreen />

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedApp />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  )
}
