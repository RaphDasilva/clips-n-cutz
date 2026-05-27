import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashPIN } from '@/lib/auth'
import { isLocalRequest, DEMO_STAFF_PREFIX } from '@/lib/env'
import type { User } from '@/types/database'

export async function GET() {
  const supabase = createClient()
  const showDemo = await isLocalRequest()

  let staffQuery = supabase
    .from('users')
    .select('id, name, phone, role, is_active, must_change_pin, sunday_grace, off_days, created_at, staff_categories(category)')
    .eq('role', 'staff')
  if (!showDemo) staffQuery = staffQuery.not('name', 'ilike', `${DEMO_STAFF_PREFIX}%`)
  staffQuery = staffQuery.order('name')

  const [staffRes, servicesRes] = await Promise.all([
    staffQuery as unknown as Promise<{
        data: (Omit<User, 'pin_hash'> & { staff_categories: { category: string }[] })[] | null
        error: { message: string } | null
      }>,
    supabase
      .from('services')
      .select('id, category')
      .eq('is_active', true) as unknown as Promise<{
        data: { id: string; category: string | null }[] | null
        error: { message: string } | null
      }>,
  ])

  if (staffRes.error || servicesRes.error) {
    return NextResponse.json({ error: 'Failed to load staff.' }, { status: 500 })
  }

  const services = servicesRes.data ?? []
  const idsByCategory = new Map<string, string[]>()
  for (const s of services) {
    if (!s.category) continue
    const arr = idsByCategory.get(s.category) ?? []
    arr.push(s.id)
    idsByCategory.set(s.category, arr)
  }

  const staff = (staffRes.data ?? []).map(({ staff_categories, ...rest }) => {
    const categories = staff_categories.map(r => r.category)
    const serviceIds = categories.flatMap(c => idsByCategory.get(c) ?? [])
    return { ...rest, categories, serviceIds }
  })

  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name: string    = (body.name  ?? '').trim()
  const phone: string   = (body.phone ?? '').trim()
  const pin: string     = (body.pin   ?? '').trim()
  const offDays: number[] = Array.isArray(body.offDays)
    ? (body.offDays as unknown[]).filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)
    : []

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
      must_change_pin: true,
      off_days: offDays,
    })
    .select('id, name, phone, role, is_active, must_change_pin, sunday_grace, off_days, created_at')
    .single() as { data: Omit<User, 'pin_hash'> | null; error: { message: string } | null }

  if (insertError || !newStaff) {
    return NextResponse.json({ error: 'Failed to create staff account.' }, { status: 500 })
  }

  return NextResponse.json({ staff: newStaff }, { status: 201 })
}
