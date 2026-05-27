import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isWithinPenaltyGrace } from '@/lib/attendance'
import { DEMO_STAFF_PREFIX } from '@/lib/env'

// Runs at 3pm Lagos time (2pm UTC) every day via Vercel Cron.
// Any active staff member with no attendance record for today is marked absent (₦5,000).
// Staff on their day off are skipped.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const today      = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const dayOfWeek  = new Date(today + 'T12:00:00').getDay()

  const [staffRes, existingRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, off_days')
      .eq('role', 'staff')
      .eq('is_active', true)
      .not('name', 'ilike', `${DEMO_STAFF_PREFIX}%`) as unknown as Promise<{
        data: { id: string; off_days: number[] }[] | null
        error: unknown
      }>,

    supabase
      .from('attendance')
      .select('staff_id')
      .eq('date', today) as unknown as Promise<{
        data: { staff_id: string }[] | null
        error: unknown
      }>,
  ])

  const staff      = staffRes.data    ?? []
  const recorded   = new Set((existingRes.data ?? []).map(r => r.staff_id))

  const toMark = staff.filter(s =>
    !(s.off_days ?? []).includes(dayOfWeek) && !recorded.has(s.id)
  )

  if (toMark.length === 0) {
    return NextResponse.json({ marked: 0, date: today })
  }

  const penalty = isWithinPenaltyGrace(today) ? 0 : 5000

  const rows = toMark.map(s => ({
    staff_id:     s.id,
    date:         today,
    checked_in_at: null,
    status:       'absent',
    penalty_ngn:  penalty,
  }))

  const { error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'staff_id,date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ marked: toMark.length, date: today })
}
