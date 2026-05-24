import bcrypt from 'bcryptjs'
import type { SessionUser, UserRole } from '@/types/database'

const SESSION_KEY = 'cnc_session'
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000 // 8 hours

interface StoredSession {
  user: SessionUser
  expiresAt: number
}

// ── Server-side only (API routes) ────────────────────────────

export async function hashPIN(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

export async function verifyPIN(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

// ── Client-side only (localStorage) ─────────────────────────

export function createSession(user: SessionUser): void {
  const session: StoredSession = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const session: StoredSession = JSON.parse(raw)
    if (Date.now() > session.expiresAt) {
      clearSession()
      return null
    }
    return session.user
  } catch {
    clearSession()
    return null
  }
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
    // Fire-and-forget: clear server-side cookie too
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  }
}

export async function switchRole(targetRole: UserRole): Promise<SessionUser | null> {
  const res = await fetch('/api/auth/switch-role', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ role: targetRole }),
  })
  if (!res.ok) return null
  const data = await res.json()
  const user = data.user as SessionUser
  // Refresh localStorage so the UI immediately reflects the new role
  createSession(user)
  return user
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'owner':   return '/dashboard/owner'
    case 'manager': return '/dashboard/manager'
    case 'staff':   return '/dashboard/staff'
  }
}
