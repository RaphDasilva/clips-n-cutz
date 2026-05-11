import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashPIN } from '@/lib/auth'
import type { User } from '@/types/database'

export async function GET() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, role, is_active, must_change_pin, created_at')
    .eq('role', 'manager')
    .order('name') as {
      data: Omit<User, 'pin_hash'>[] | null
      error: { message: string } | null
    }

  if (error) return NextResponse.json({ error: 'Failed to load team.' }, { status: 500 })
  return NextResponse.json({ team: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body  = await req.json()
  const name  = (body.name  ?? '').trim() as string
  const phone = (body.phone ?? '').trim() as string
  const pin   = (body.pin   ?? '').trim() as string

  if (!name || !phone || !pin) {
    return NextResponse.json({ error: 'Name, phone number, and PIN are required.' }, { status: 400 })
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 4 digits.' }, { status: 400 })
  }

  const supabase = createClient()

  const { data: existing } = await supabase.from('users').select('id').eq('phone', phone).single()
  if (existing) {
    return NextResponse.json({ error: 'A user with this phone number already exists.' }, { status: 409 })
  }

  const pinHash = await hashPIN(pin)
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({ name, phone, pin_hash: pinHash, role: 'manager', is_active: true, must_change_pin: true })
    .select('id, name, phone, role, is_active, must_change_pin, created_at')
    .single() as { data: Omit<User, 'pin_hash'> | null; error: { message: string } | null }

  if (insertError || !newUser) {
    return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 })
  }

  return NextResponse.json({ user: newUser }, { status: 201 })
}
