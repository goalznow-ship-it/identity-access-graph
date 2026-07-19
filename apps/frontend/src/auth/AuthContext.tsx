import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { clearAccessToken, currentSession, login as authenticate, type SessionUser } from '../services/authApi'

interface AuthState { user: SessionUser | null; loading: boolean; authenticationEnabled: boolean; error: string | null; login: (username: string, password: string) => Promise<void>; logout: () => void; refresh: () => Promise<void> }
const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authenticationEnabled, setAuthenticationEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try { const session = await currentSession(); setUser(session.user); setAuthenticationEnabled(session.authenticationEnabled) }
    catch (cause) { setUser(null); if ((cause as any).status !== 401) setError((cause as Error).message) }
    finally { setLoading(false) }
  }, [])
  const login = useCallback(async (username: string, password: string) => { await authenticate(username, password); await refresh() }, [refresh])
  const logout = useCallback(() => { clearAccessToken(); setUser(null); setAuthenticationEnabled(true) }, [])
  useEffect(() => { void refresh(); window.addEventListener('iag:unauthorized', logout); return () => window.removeEventListener('iag:unauthorized', logout) }, [refresh, logout])
  return <AuthContext.Provider value={{ user, loading, authenticationEnabled, error, login, logout, refresh }}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value }
