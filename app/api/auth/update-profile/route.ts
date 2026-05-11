import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPIN } from '@/lib/auth'
import type { User } from '@/types/database'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const userId: string  = (body.userId  ?? '').trim()
  const currentPIN: string = (body.currentPIN ?? '').trim()
  const name: string    = (body.name    ?? '').trim()
  const phone: string   = (body.phone   ?? '').trim()

  if (!userId || !currentPIN || !name || !phone) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  if (!/^\d+$/.test(phone) || phone.length < 10) {
    return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 })
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
    return NextResponse.json({ error: 'Current PIN is incorrect.' }, { status: 401 })
  }

  // Make sure no other user already has this phone number
  if (phone !== user.phone) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .neq('id', userId)
      .single()
    if (existing) {
      return NextResponse.json({ error: 'That phone number is already in use.' }, { status: 409 })
    }
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ name, phone })
    .eq('id', userId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save changes. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
