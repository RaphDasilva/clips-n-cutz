import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashPIN } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const action: string = body.action ?? ''

  const supabase = createClient()

  // action: "toggle" — flip is_active
  if (action === 'toggle') {
    const { data: user } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', id)
      .single() as { data: { is_active: boolean } | null; error: unknown }

    if (!user) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    const { error } = await supabase
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update status.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_active: !user.is_active })
  }

  // action: "reset-pin" — manager resets PIN without knowing current PIN
  if (action === 'reset-pin') {
    const newPIN: string = (body.newPIN ?? '').trim()

    if (!/^\d{4}$/.test(newPIN)) {
      return NextResponse.json(
        { error: 'New PIN must be exactly 4 digits.' },
        { status: 400 }
      )
    }

    const newHash = await hashPIN(newPIN)

    const { error } = await supabase
      .from('users')
      .update({ pin_hash: newHash, must_change_pin: true })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to reset PIN.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // action: "set-services" — replace staff member's service list
  if (action === 'set-services') {
    const serviceIds: string[] = Array.isArray(body.serviceIds) ? body.serviceIds : []

    const { error: delError } = await supabase
      .from('staff_services')
      .delete()
      .eq('staff_id', id)

    if (delError) {
      return NextResponse.json({ error: 'Failed to update services.' }, { status: 500 })
    }

    if (serviceIds.length > 0) {
      const rows = serviceIds.map(service_id => ({ staff_id: id, service_id }))
      const { error: insError } = await supabase.from('staff_services').insert(rows)
      if (insError) {
        return NextResponse.json({ error: 'Failed to save services.' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, serviceIds })
  }

  // action: "toggle-sunday-grace" — flip the Sunday 1pm grace for a staff member
  if (action === 'toggle-sunday-grace') {
    const { data: user } = await supabase
      .from('users')
      .select('sunday_grace')
      .eq('id', id)
      .single() as { data: { sunday_grace: boolean } | null; error: unknown }

    if (!user) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })

    const { error } = await supabase
      .from('users')
      .update({ sunday_grace: !user.sunday_grace })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Failed to update.' }, { status: 500 })
    return NextResponse.json({ success: true, sunday_grace: !user.sunday_grace })
  }

  // action: "set-off-days" — update which days of the week this staff member is off
  if (action === 'set-off-days') {
    const offDays: number[] = Array.isArray(body.offDays)
      ? (body.offDays as unknown[]).filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)
      : []

    const { error } = await supabase
      .from('users')
      .update({ off_days: offDays })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Failed to update off days.' }, { status: 500 })
    return NextResponse.json({ success: true, off_days: offDays })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}
