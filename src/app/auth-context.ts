import { createContext } from 'react'
import type { User } from '../lib/api'

export type AuthContextValue = {
  user: User | null
  status: 'loading' | 'ready'
  signIn: (username: string, password: string) => Promise<void>
  signUp: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
