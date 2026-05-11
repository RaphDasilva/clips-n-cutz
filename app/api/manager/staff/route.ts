import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashPIN } from '@/lib/auth'
import type { User } from '@/types/database'

export async function GET() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, role, is_active, must_change_pin, created_at, staff_services(service_id)')
    .eq('role', 'staff')
    .order('name') as {
      data: (Omit<User, 'pin_hash'> & { staff_services: { service_id: string }[] })[] | null
      error: { message: string } | null
    }

  if (error) {
    return NextResponse.json({ error: 'Failed to load staff.' }, { status: 500 })
  }

  const staff = (data ?? []).map(({ staff_services, ...rest }) => ({
    ...rest,
    serviceIds: staff_services.map(r => r.service_id),
  }))

  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name: string  = (body.name  ?? '').trim()
  const phone: string = (body.phone ?? '').trim()
  const pin: string   = (body.pin   ?? '').trim()

  if (!name || !phone || !pin) {
    return NextResponse.json(
      { error: 'Name, phone number, and starting PIN are required.' },
      { status: 400 }
    )
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json(
      { error: 'PIN must be exactly 4 digits.' },
      { status: 400 }
    )
  }

  const supabase = createClient()

  // Check phone not already registered
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'A user with this phone number already exists.' },
      { status: 409 }
    )
  }

  const pinHash = await hashPIN(pin)

  const { data: newStaff, error: insertError } = await supabase
    .from('users')
    .insert({
      name,
      phone,
      pin_hash: pinHash,
      role: 'staff',
      is_active: true,
      must_change_pin: true, // force PIN change on first login
    })
    .select('id, name, phone, role, is_active, must_change_pin, created_at')
    .single() as { data: Omit<User, 'pin_hash'> | null; error: { message: string } | null }

  if (insertError || !newStaff) {
    return NextResponse.json({ error: 'Failed to create staff account.' }, { status: 500 })
  }

  return NextResponse.json({ staff: newStaff }, { status: 201 })
}
