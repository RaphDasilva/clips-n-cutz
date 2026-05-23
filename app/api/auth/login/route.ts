import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPIN } from '@/lib/auth'
import { signSessionToken, SESSION_COOKIE } from '@/lib/auth-server'
import type { User, SessionUser } from '@/types/database'

const MAX_FAILED_ATTEMPTS  = 5
const LOCKOUT_MINUTES      = 15

export async function POST(req: NextRequest) {
  const body = await req.json()
  const phone: string = (body.phone ?? '').trim()
  const pin: string   = (body.pin   ?? '').trim()

  if (!phone || !pin) {
    return NextResponse.json(
      { error: 'Phone number and PIN are required.' },
      { status: 400 }
    )
  }

  const supabase = createClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single() as { data: (User & { failed_pin_attempts: number; pin_locked_until: string | null }) | null; error: { message: string } | null }

  if (error || !user) {
    return NextResponse.json(
      { error: 'Phone number not found.' },
      { status: 401 }
    )
  }

  if (!user.is_active) {
    return NextResponse.json(
      { error: 'This account has been deactivated. See the manager.' },
      { status: 403 }
    )
  }

  // ── Check if locked ─────────────────────────────────────────
  if (user.pin_locked_until && new Date(user.pin_locked_until) > new Date()) {
    const minsLeft = Math.ceil(
      (new Date(user.pin_locked_until).getTime() - Date.now()) / 60_000
    )
    return NextResponse.json(
      { error: `Too many wrong attempts. Try again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'}.` },
      { status: 423 }
    )
  }

  const pinMatches = await verifyPIN(pin, user.pin_hash)

  if (!pinMatches) {
    const newAttempts = (user.failed_pin_attempts ?? 0) + 1
    const update: { failed_pin_attempts: number; pin_locked_until?: string } = {
      failed_pin_attempts: newAttempts,
    }
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      update.pin_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
    }
    await supabase.from('users').update(update).eq('id', user.id)

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      return NextResponse.json(
        { error: `Too many wrong attempts. Account locked for ${LOCKOUT_MINUTES} minutes.` },
        { status: 423 }
      )
    }

    const left = MAX_FAILED_ATTEMPTS - newAttempts
    return NextResponse.json(
      { error: `Incorrect PIN. ${left} attempt${left === 1 ? '' : 's'} left.` },
      { status: 401 }
    )
  }

  // ── Successful login — reset lockout counter ────────────────
  if (user.failed_pin_attempts > 0 || user.pin_locked_until) {
    await supabase
      .from('users')
      .update({ failed_pin_attempts: 0, pin_locked_until: null })
      .eq('id', user.id)
  }

  const sessionUser: SessionUser = {
    id:            user.id,
    name:          user.name,
    phone:         user.phone,
    role:          user.role,
    mustChangePIN: user.must_change_pin,
  }

  const token = await signSessionToken(sessionUser)

  const res = NextResponse.json({ user: sessionUser })
  res.cookies.set({
    ...SESSION_COOKIE,
    value: token,
  })
  return res
}
