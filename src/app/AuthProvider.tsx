import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type User } from '../lib/api'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')

  useEffect(() => {
    let active = true
    api.me().then((currentUser) => {
      if (active) setUser(currentUser)
    }).catch(() => {
      if (active) setUser(null)
    }).finally(() => {
      if (active) setStatus('ready')
    })
    return () => { active = false }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    async signIn(username, password) {
      setUser(await api.signIn(username, password))
    },
    async signUp(username, password) {
      setUser(await api.signUp(username, password))
    },
    async signOut() {
      await api.signOut()
      setUser(null)
    },
    async changePassword(currentPassword, newPassword) {
      await api.changePassword(currentPassword, newPassword)
      setUser(null)
    },
  }), [user, status])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
