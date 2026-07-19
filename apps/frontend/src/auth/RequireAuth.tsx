import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useAuth } from './AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth(), location = useLocation()
  if (auth.loading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (!auth.user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  return <>{children}</>
}
