import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'
import type { UserRole } from '@/types/database'

// ── Public API routes — no auth required ─────────────────────
const PUBLIC_PREFIXES = [
  '/api/auth/login',
  '/api/book',
  '/api/public/',
  '/api/cron/',   // cron routes verify their own CRON_SECRET header
]

// ── Role rules — first match wins ────────────────────────────
const ROLE_RULES: { prefix: string; allow: UserRole[] }[] = [
  { prefix: '/api/manager/', allow: ['manager'] },
  { prefix: '/api/owner/',   allow: ['owner']   },
  { prefix: '/api/staff/',   allow: ['staff', 'manager'] },
]

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (!path.startsWith('/api')) return NextResponse.next()
  if (PUBLIC_PREFIXES.some(p => path.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE.name)?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await verifySessionToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
  }

  // Enforce role permissions
  for (const rule of ROLE_RULES) {
    if (path.startsWith(rule.prefix) && !rule.allow.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
