import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPIN, hashPIN } from '@/lib/auth'
import type { User } from '@/types/database'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const userId: string    = (body.userId     ?? '').trim()
  const currentPIN: string = (body.currentPIN ?? '').trim()
  const newPIN: string    = (body.newPIN      ?? '').trim()

  if (!userId || !currentPIN || !newPIN) {
    return NextResponse.json(
      { error: 'All fields are required.' },
      { status: 400 }
    )
  }

  if (!/^\d{4}$/.test(newPIN)) {
    return NextResponse.json(
      { error: 'New PIN must be exactly 4 digits.' },
      { status: 400 }
    )
  }

  if (currentPIN === newPIN) {
    return NextResponse.json(
      { error: 'New PIN must be different from your current PIN.' },
      { status: 400 }
    )
  }

  const supabase = createClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single() as { data: User | null; error: { message: string } | null }

  if (error || !user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  const pinMatches = await verifyPIN(currentPIN, user.pin_hash)
  if (!pinMatches) {
    return NextResponse.json(
      { error: 'Current PIN is incorrect.' },
      { status: 401 }
    )
  }

  const newHash = await hashPIN(newPIN)

  const { error: updateError } = await supabase
    .from('users')
    .update({ pin_hash: newHash, must_change_pin: false })
    .eq('id', userId)

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to save new PIN. Try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
