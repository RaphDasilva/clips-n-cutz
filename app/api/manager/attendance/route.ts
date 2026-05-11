import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Penalty rules:
// Mon-Sat: opens 9am, grace until 9:30am
//   9:31am–11:59am = ₦1,000 | 12pm+ = ₦2,000 | absent = ₦5,000
// Sunday: opens 12pm, NO grace
//   after 12pm = ₦1,000 | sunday_grace staff: allowed until 1pm | absent = ₦5,000
function calcPenalty(checkedInAt: string | null, dateStr: string, sundayGrace: boolean): number {
  if (!checkedInAt) return 5000

  const isSunday = new Date(dateStr + 'T12:00:00').getDay() === 0
  const [h, m]   = checkedInAt.split(':').map(Number)
  const mins     = h * 60 + m

  if (isSunday) {
    const deadline = sundayGrace ? 13 * 60 : 12 * 60
    return mins <= deadline ? 0 : 1000
  }

  if (mins <= 9 * 60 + 30) return 0
  if (mins < 12 * 60)      return 1000
  return 2000
}

function calcStatus(checkedInAt: string | null, penalty: number): string {
  if (!checkedInAt) return 'absent'
  return penalty === 0 ? 'on_time' : 'late'
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
    ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })

  const supabase = createClient()

  const [staffRes, attRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, sunday_grace')
      .eq('role', 'staff')
      .eq('is_active', true)
      .order('name') as unknown as Promise<{ data: { id: string; name: string; sunday_grace: boolean }[] | null; error: unknown }>,

    supabase
      .from('attendance')
      .select('staff_id, checked_in_at, status, penalty_ngn')
      .eq('date', date) as unknown as Promise<{ data: { staff_id: string; checked_in_at: string | null; status: string; penalty_ngn: number }[] | null; error: unknown }>,
  ])

  const staff      = staffRes.data ?? []
  const attMap     = new Map((attRes.data ?? []).map(r => [r.staff_id, r]))

  const result = staff.map(s => ({
    id:           s.id,
    name:         s.name,
    sunday_grace: s.sunday_grace,
    record:       attMap.get(s.id) ?? null,
  }))

  return NextResponse.json({ date, staff: result })
}

export async function POST(req: NextRequest) {
  const body        = await req.json()
  const staffId     = (body.staffId     ?? '').trim() as string
  const date        = (body.date        ?? '').trim() as string
  const checkedInAt = (body.checkedInAt ?? null)      as string | null
  const sundayGrace = Boolean(body.sundayGrace)

  if (!staffId || !date) {
    return NextResponse.json({ error: 'staffId and date are required.' }, { status: 400 })
  }

  const penalty = calcPenalty(checkedInAt, date, sundayGrace)
  const status  = calcStatus(checkedInAt, penalty)

  const supabase = createClient()

  const { error } = await supabase
    .from('attendance')
    .upsert({ staff_id: staffId, date, checked_in_at: checkedInAt, status, penalty_ngn: penalty },
             { onConflict: 'staff_id,date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, status, penalty_ngn: penalty })
}
