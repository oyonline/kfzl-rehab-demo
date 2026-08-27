import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { currentSession, type Role } from '../auth/auth'

export function RequireAuth({ role, loginPath, children }: { role: Role; loginPath: string; children: ReactNode }) {
  const session = currentSession()
  if (!session || session.role !== role) return <Navigate to={loginPath} replace />
  return <>{children}</>
}
