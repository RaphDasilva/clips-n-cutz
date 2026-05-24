import { NextRequest, NextResponse } from 'next/server'
import { signSessionToken, verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'
import type { UserRole, SessionUser } from '@/types/database'

// ── Allowed switches ─────────────────────────────────────────
// Only owners may impersonate. They can swap into the manager
// view and back. Managers and staff cannot impersonate anyone.
const ALLOWED: { from: UserRole; to: UserRole }[] = [
  { from: 'owner', to: 'manager' },
  { from: 'owner', to: 'owner'   }, // switch back from impersonation
]

export async function POST(req: NextRequest) {
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const body         = await req.json().catch(() => ({}))
  const target       = body.role as UserRole | undefined
  const actualRole   = session.actualRole ?? session.role

  if (!target || !['owner', 'manager', 'staff'].includes(target)) {
    return NextResponse.json({ error: 'Invalid target role.' }, { status: 400 })
  }

  if (!ALLOWED.some(rule => rule.from === actualRole && rule.to === target)) {
    return NextResponse.json({ error: 'You cannot switch to that role.' }, { status: 403 })
  }

  const newSession: SessionUser = {
    id:            session.id,
    name:          session.name,
    phone:         session.phone,
    role:          target,
    mustChangePIN: false,
    actualRole,
  }

  const newToken = await signSessionToken(newSession)

  const res = NextResponse.json({ user: newSession })
  res.cookies.set({
    ...SESSION_COOKIE,
    value: newToken,
  })
  return res
}
