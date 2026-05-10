'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, getDashboardPath } from '@/lib/auth'
import type { UserRole, SessionUser } from '@/types/database'

interface AuthGuardProps {
  allowedRoles: UserRole[]
  children: (user: SessionUser) => React.ReactNode
}

/**
 * Wraps any dashboard page. Redirects to /login if no valid session exists.
 * Redirects to the correct dashboard if the user's role is not in allowedRoles.
 * Redirects to /change-pin if mustChangePIN is true.
 *
 * Usage:
 *   <AuthGuard allowedRoles={['manager']}>
 *     {(user) => <ManagerDashboard user={user} />}
 *   </AuthGuard>
 */
export function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const session = getSession()

    if (!session) {
      router.replace('/login')
      return
    }

    if (session.mustChangePIN) {
      router.replace('/change-pin')
      return
    }

    if (!allowedRoles.includes(session.role)) {
      router.replace(getDashboardPath(session.role))
      return
    }

    setUser(session)
    setChecking(false)
  }, [router, allowedRoles])

  if (checking || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
          <p className="text-gray-600 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  return <>{children(user)}</>
}
