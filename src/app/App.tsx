import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { AppShell } from '../components/AppShell'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../features/auth/LoginPage'
import { AccountPage } from '../features/account/AccountPage'
import { lazy, Suspense } from 'react'
import { UsersPage } from '../pages/UsersPage'

const AudioConverterPage = lazy(() => import('../pages/AudioConverterPage'))
const MusicPage = lazy(() => import('../pages/MusicPage'))
const AtmospherePage = lazy(() => import('../pages/AtmospherePage'))
const TowerDefensePage = lazy(() => import('../pages/TowerDefensePage'))

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

function ProtectedMusic() {
  const { user, status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Suspense fallback={<LoadingScreen />}><MusicPage /></Suspense>
}

export function App() {
  const { user, status, needsSetup } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'error') return <main className="loading-screen"><p role="alert">无法连接本地账号服务，请检查 NAS 服务后重试。</p><button onClick={() => window.location.reload()}>重新连接</button></main>
  if (needsSetup) return <LoginPage key="setup" initializing />

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedApp />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/users" element={user?.role === 'admin' ? <UsersPage /> : <Navigate to="/" replace />} />
        <Route path="/tools/m4a-to-flac" element={<Suspense fallback={<LoadingScreen />}><AudioConverterPage /></Suspense>} />
        <Route path="/tools/atmosphere" element={<Suspense fallback={<LoadingScreen />}><AtmospherePage /></Suspense>} />
        <Route path="/tools/tower-defense" element={<Suspense fallback={<LoadingScreen />}><TowerDefensePage /></Suspense>} />
      </Route>
      <Route path="/tools/music" element={<ProtectedMusic />} />
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  )
}
