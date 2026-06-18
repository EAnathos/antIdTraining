import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import { clearAuth } from './auth'
import { AUTH_CHANGED_EVENT, AUTH_ROLE_KEY } from './authKeys'
import type { AuthMeResponse } from '../types/models'

interface AuthContextValue {
  /** Full profile — null until the /auth/me fetch resolves or if unauthenticated. */
  profile: AuthMeResponse | null
  /** Role derived from localStorage immediately, then kept in sync with the cookie. */
  role: 'ADMIN' | 'USER' | null
  /** True while the initial /auth/me fetch is in flight. */
  isLoading: boolean
  /** Re-fetches /auth/me and updates the context (e.g. after a profile PATCH). */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  role: null,
  isLoading: true,
  refresh: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<'ADMIN' | 'USER' | null>(() =>
    typeof window !== 'undefined'
      ? (window.localStorage.getItem(AUTH_ROLE_KEY) as 'ADMIN' | 'USER' | null)
      : null,
  )
  const [profile, setProfile] = useState<AuthMeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<AuthMeResponse>('/auth/me')
      setProfile(res.data)
      setRole(res.data.role)
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 401) clearAuth()
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()

    const onAuthChanged = () => {
      const stored = window.localStorage.getItem(AUTH_ROLE_KEY) as
        | 'ADMIN'
        | 'USER'
        | null
      setRole(stored)
      if (!stored) setProfile(null)
    }

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
    window.addEventListener('storage', onAuthChanged)
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
      window.removeEventListener('storage', onAuthChanged)
    }
  }, [refresh])

  return (
    <AuthContext.Provider value={{ profile, role, isLoading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
