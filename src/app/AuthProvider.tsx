import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError, type User } from '../lib/api'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const setup = await api.setupStatus()
        let currentUser: User | null = null
        if (!setup.needsSetup) {
          try { currentUser = await api.me() } catch (error) {
            if (!(error instanceof ApiError && error.status === 401)) throw error
          }
        }
        if (active) { setNeedsSetup(setup.needsSetup); setUser(currentUser); setStatus('ready') }
      } catch { if (active) setStatus('error') }
    }
    void load()
    return () => { active = false }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    needsSetup,
    async signIn(username, password) {
      setUser(await api.signIn(username, password))
    },
    async setup(username, password) {
      try { setUser(await api.setup(username, password)); setNeedsSetup(false) }
      catch (error) {
        if (error instanceof ApiError && error.code === 'setup_closed') setNeedsSetup(false)
        throw error
      }
    },
    async signOut() {
      await api.signOut()
      setUser(null)
    },
    async changePassword(currentPassword, newPassword) {
      await api.changePassword(currentPassword, newPassword)
      setUser(null)
    },
  }), [user, status, needsSetup])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
