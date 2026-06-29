import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isWithinPenaltyGrace } from '@/lib/attendance'
import { isLocalRequest, DEMO_STAFF_PREFIX } from '@/lib/env'

// Penalty rules:
// Mon-Sat: opens 9am, grace until 9:30am
//   9:31am–10:59am = ₦1,000 | 11am+ = ₦2,000 | absent = ₦5,000
// Sunday: opens 12pm
//   after 12:30pm = ₦1,000 | sunday_grace staff: allowed until 1:30pm | absent = ₦5,000
function calcPenalty(checkedInAt: string | null, dateStr: string, sundayGrace: boolean): number {
  if (!checkedInAt) return 5000

  const isSunday = new Date(dateStr + 'T12:00:00').getDay() === 0
  const [h, m]   = checkedInAt.split(':').map(Number)
  const mins     = h * 60 + m

  if (isSunday) {
    const deadline = sundayGrace ? 13 * 60 + 30 : 12 * 60 + 30
    return mins <= deadline ? 0 : 1000
  }

  if (mins <= 9 * 60 + 30) return 0
  if (mins < 11 * 60)      return 1000
  return 2000
}

function calcStatus(checkedInAt: string | null, penalty: number): string {
  if (!checkedInAt) return 'absent'
  return penalty === 0 ? 'on_time' : 'late'
}

// Current time in Africa/Lagos as HH:MM:SS
function lagosTimeNow(): string {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
    ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })

  const supabase = createClient()
  const showDemo = await isLocalRequest()

  let staffQuery = supabase
    .from('users')
    .select('id, name, sunday_grace, off_days')
    .eq('role', 'staff')
    .eq('is_active', true)
  if (!showDemo) staffQuery = staffQuery.not('name', 'ilike', `${DEMO_STAFF_PREFIX}%`)
  staffQuery = staffQuery.order('name')

  const [staffRes, attRes, pendingRes] = await Promise.all([
    staffQuery as unknown as Promise<{
        data: { id: string; name: string; sunday_grace: boolean; off_days: number[] }[] | null
        error: unknown
      }>,

    supabase
      .from('attendance')
      .select('staff_id, checked_in_at, status, penalty_ngn')
      .eq('date', date) as unknown as Promise<{
        data: { staff_id: string; checked_in_at: string | null; status: string; penalty_ngn: number }[] | null
        error: unknown
      }>,

    supabase
      .from('checkin_requests')
      .select('staff_id, requested_at, users(name, sunday_grace, off_days)')
      .eq('date', date)
      .eq('status', 'pending') as unknown as Promise<{
        data: {
          staff_id: string
          requested_at: string
          users: { name: string; sunday_grace: boolean; off_days: number[] } | null
        }[] | null
        error: unknown
      }>,
  ])

  const staff   = staffRes.data   ?? []
  const attMap  = new Map((attRes.data ?? []).map(r => [r.staff_id, r]))

  const result = staff.map(s => ({
    id:           s.id,
    name:         s.name,
    sunday_grace: s.sunday_grace,
    off_days:     s.off_days,
    record:       attMap.get(s.id) ?? null,
  }))

  const pending = (pendingRes.data ?? [])
    .filter(r => showDemo || !(r.users?.name ?? '').toUpperCase().startsWith(DEMO_STAFF_PREFIX))
    .map(r => ({
      staff_id:     r.staff_id,
      name:         r.users?.name ?? '',
      sunday_grace: r.users?.sunday_grace ?? false,
      off_days:     r.users?.off_days     ?? [],
      requested_at: r.requested_at,
    }))

  return NextResponse.json({ date, staff: result, pending })
}

export async function POST(req: NextRequest) {
  const body    = await req.json()
  const action  = (body.action ?? '') as string
  const staffId = (body.staffId ?? '').trim() as string
  const date    = (body.date    ?? '').trim() as string

  if (!staffId || !date) {
    return NextResponse.json({ error: 'staffId and date are required.' }, { status: 400 })
  }

  const supabase = createClient()

  // ── Confirm: record exact Lagos time when manager taps Confirm ──
  if (action === 'confirm') {
    const sundayGrace = Boolean(body.sundayGrace)
    const checkedInAt = lagosTimeNow()
    const computed    = calcPenalty(checkedInAt, date, sundayGrace)
    const penalty     = isWithinPenaltyGrace(date) ? 0 : computed
    const status      = calcStatus(checkedInAt, computed)

    const { error: attError } = await supabase
      .from('attendance')
      .upsert(
        { staff_id: staffId, date, checked_in_at: checkedInAt, status, penalty_ngn: penalty },
        { onConflict: 'staff_id,date' }
      )

    if (attError) return NextResponse.json({ error: attError.message }, { status: 500 })

    await supabase
      .from('checkin_requests')
      .update({ status: 'confirmed' })
      .eq('staff_id', staffId)
      .eq('date', date)

    return NextResponse.json({ success: true, checked_in_at: checkedInAt, status, penalty_ngn: penalty })
  }

  // ── Dismiss: remove the pending request, no attendance record ──
  if (action === 'dismiss') {
    const { error } = await supabase
      .from('checkin_requests')
      .update({ status: 'dismissed' })
      .eq('staff_id', staffId)
      .eq('date', date)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Manual entry: manager types time directly ──
  const checkedInAt = (body.checkedInAt ?? null) as string | null
  const sundayGrace = Boolean(body.sundayGrace)
  const computed    = calcPenalty(checkedInAt, date, sundayGrace)
  const penalty     = isWithinPenaltyGrace(date) ? 0 : computed
  const status      = calcStatus(checkedInAt, computed)

  const { error } = await supabase
    .from('attendance')
    .upsert(
      { staff_id: staffId, date, checked_in_at: checkedInAt, status, penalty_ngn: penalty },
      { onConflict: 'staff_id,date' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, status, penalty_ngn: penalty })
}
