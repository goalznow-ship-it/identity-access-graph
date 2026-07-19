import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { hasMinimumRole, type PlatformRole } from '../services/authApi'

export function RequireRole({ role, children }: { role: PlatformRole; children: ReactNode }) {
  const { user } = useAuth()
  return hasMinimumRole(user?.role, role) ? <>{children}</> : <Navigate to="/" replace />
}
