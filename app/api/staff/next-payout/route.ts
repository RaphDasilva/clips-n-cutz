import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'

// Staff view — what they're due this Sunday and the last few
// weeks of paid history.
export async function GET(req: NextRequest) {
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const staffId  = session.id

  // Lagos today + this week's Monday→Sunday
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const d = new Date(todayStr + 'T12:00:00')
  const day = d.getUTCDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(d); monday.setUTCDate(d.getUTCDate() + diffToMon)
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6)
  const weekStart = monday.toISOString().slice(0, 10)
  const weekEnd   = sunday.toISOString().slice(0, 10)

  const [vsRes, visitsRes, attRes, historyRes, paidThisWeekRes] = await Promise.all([
    supabase
      .from('visit_services')
      .select('commission_ngn, visits!inner(visit_date)')
      .eq('staff_id', staffId)
      .gte('visits.visit_date', weekStart)
      .lte('visits.visit_date', weekEnd) as unknown as Promise<{ data: { commission_ngn: number }[] | null; error: unknown }>,
    supabase
      .from('visits')
      .select('tip_ngn')
      .eq('staff_id', staffId)
      .gte('visit_date', weekStart)
      .lte('visit_date', weekEnd) as unknown as Promise<{ data: { tip_ngn: number }[] | null; error: unknown }>,
    supabase
      .from('attendance')
      .select('penalty_ngn')
      .eq('staff_id', staffId)
      .gte('date', weekStart)
      .lte('date', weekEnd) as unknown as Promise<{ data: { penalty_ngn: number }[] | null; error: unknown }>,
    supabase
      .from('staff_payouts')
      .select('week_start, week_end, total_ngn, paid_at, paid_amount_ngn')
      .eq('staff_id', staffId)
      .order('week_start', { ascending: false })
      .limit(4) as unknown as Promise<{ data: { week_start: string; week_end: string; total_ngn: number; paid_at: string; paid_amount_ngn: number | null }[] | null; error: unknown }>,
    supabase
      .from('staff_payouts')
      .select('id, total_ngn, paid_amount_ngn, paid_at')
      .eq('staff_id', staffId)
      .eq('week_start', weekStart)
      .maybeSingle() as unknown as Promise<{ data: { id: string; total_ngn: number; paid_amount_ngn: number | null; paid_at: string } | null; error: unknown }>,
  ])

  const commission = (vsRes.data     ?? []).reduce((s, r) => s + (r.commission_ngn ?? 0), 0)
  const tips       = (visitsRes.data ?? []).reduce((s, r) => s + (r.tip_ngn        ?? 0), 0)
  const penalty    = (attRes.data    ?? []).reduce((s, r) => s + (r.penalty_ngn    ?? 0), 0)
  const total      = Math.max(0, commission + tips - penalty)

  return NextResponse.json({
    weekStart, weekEnd,
    pending: {
      commission_ngn: commission,
      tips_ngn:       tips,
      penalty_ngn:    penalty,
      total_ngn:      total,
      alreadyPaid:    paidThisWeekRes.data ?? null,
    },
    history: historyRes.data ?? [],
  })
}
