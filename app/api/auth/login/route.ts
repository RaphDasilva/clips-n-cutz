import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPIN } from '@/lib/auth'
import { signSessionToken, SESSION_COOKIE } from '@/lib/auth-server'
import type { User, SessionUser } from '@/types/database'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const phone: string = (body.phone ?? '').trim()
  const pin: string = (body.pin ?? '').trim()

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
    .single() as { data: User | null; error: { message: string } | null }

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

  const pinMatches = await verifyPIN(pin, user.pin_hash)
  if (!pinMatches) {
    return NextResponse.json(
      { error: 'Incorrect PIN. Try again.' },
      { status: 401 }
    )
  }

  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
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
