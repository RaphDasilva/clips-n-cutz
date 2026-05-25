import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function lagosDateStr(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) // YYYY-MM-DD
}

function lagosWeekStart(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }))
  const day = now.getDay() // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day // Monday = 0 offset
  now.setDate(now.getDate() + diff)
  return now.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

function lagosMonthStart(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }).slice(0, 7) + '-01'
}

interface VisitRow { total_ngn: number; tip_ngn: number; payment_method: string }

function totals(rows: VisitRow[]) {
  const byPayment = { cash: 0, transfer: 0, pos: 0 }
  for (const r of rows) {
    if (r.payment_method === 'cash')     byPayment.cash     += r.total_ngn
    else if (r.payment_method === 'transfer') byPayment.transfer += r.total_ngn
    else if (r.payment_method === 'pos') byPayment.pos      += r.total_ngn
  }
  return {
    revenue: rows.reduce((s, r) => s + r.total_ngn, 0),
    tips:    rows.reduce((s, r) => s + (r.tip_ngn ?? 0), 0),
    visits:  rows.length,
    byPayment,
  }
}

export async function GET() {
  const supabase = createClient()

  const today      = lagosDateStr()
  const yesterday  = lagosDateStr(-1)
  const weekStart  = lagosWeekStart()
  const monthStart = lagosMonthStart()

  const [todayRes, yesterdayRes, weekRes, monthRes] = await Promise.all([
    supabase.from('visits').select('total_ngn, tip_ngn, payment_method').eq('visit_date', today),
    supabase.from('visits').select('total_ngn, tip_ngn, payment_method').eq('visit_date', yesterday),
    supabase.from('visits').select('total_ngn, tip_ngn, payment_method').gte('visit_date', weekStart).lte('visit_date', today),
    supabase.from('visits').select('total_ngn, tip_ngn, payment_method').gte('visit_date', monthStart).lte('visit_date', today),
  ])

  const todayData     = (todayRes.data     ?? []) as VisitRow[]
  const yesterdayData = (yesterdayRes.data ?? []) as VisitRow[]
  const weekData      = (weekRes.data      ?? []) as VisitRow[]
  const monthData     = (monthRes.data     ?? []) as VisitRow[]

  return NextResponse.json({
    today:     totals(todayData),
    yesterday: totals(yesterdayData),
    week:      totals(weekData),
    month:     totals(monthData),
  })
}
