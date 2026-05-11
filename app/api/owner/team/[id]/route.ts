import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashPIN } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body   = await req.json()
  const supabase = createClient()

  if (body.action === 'toggle-active') {
    const { data: current } = await supabase.from('users').select('is_active').eq('id', id).single()
    if (!current) return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    const { error } = await supabase.from('users').update({ is_active: !current.is_active }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, is_active: !current.is_active })
  }

  if (body.action === 'reset-pin') {
    const pin = (body.pin ?? '').trim() as string
    if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'PIN must be 4 digits.' }, { status: 400 })
    const pinHash = await hashPIN(pin)
    const { error } = await supabase.from('users').update({ pin_hash: pinHash, must_change_pin: true }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}
