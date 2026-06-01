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
interface DatedAmount { date: string; amount: number }

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

function sumInRange(rows: DatedAmount[], fromDate: string, toDate: string): number {
  return rows.reduce((s, r) => (r.date >= fromDate && r.date <= toDate ? s + r.amount : s), 0)
}

export async function GET() {
  const supabase = createClient()

  const today      = lagosDateStr()
  const yesterday  = lagosDateStr(-1)
  const weekStart  = lagosWeekStart()
  const monthStart = lagosMonthStart()

  const [todayRes, yesterdayRes, weekRes, monthRes, commissionRes, expensesRes, attendanceRes, reconsRes] = await Promise.all([
    supabase.from('visits').select('total_ngn, tip_ngn, payment_method').eq('visit_date', today),
    supabase.from('visits').select('total_ngn, tip_ngn, payment_method').eq('visit_date', yesterday),
    supabase.from('visits').select('total_ngn, tip_ngn, payment_method').gte('visit_date', weekStart).lte('visit_date', today),
    supabase.from('visits').select('total_ngn, tip_ngn, payment_method').gte('visit_date', monthStart).lte('visit_date', today),

    // Commission joined to visits so we can filter by visit_date (the
    // canonical day a service was rendered) instead of created_at.
    supabase.from('visit_services').select('commission_ngn, visits!inner(visit_date)')
      .gte('visits.visit_date', monthStart).lte('visits.visit_date', today),

    supabase.from('expenses').select('date, amount_ngn').gte('date', monthStart).lte('date', today),
    supabase.from('attendance').select('date, penalty_ngn').gte('date', monthStart).lte('date', today),
    supabase.from('cash_reconciliations').select('date, variance_ngn').gte('date', monthStart).lte('date', today),
  ])

  const todayData     = (todayRes.data     ?? []) as VisitRow[]
  const yesterdayData = (yesterdayRes.data ?? []) as VisitRow[]
  const weekData      = (weekRes.data      ?? []) as VisitRow[]
  const monthData     = (monthRes.data     ?? []) as VisitRow[]

  const rawCommissionRows = (commissionRes.data ?? []) as unknown as Array<{ commission_ngn: number; visits: { visit_date: string } | null }>
  const commissionRows = rawCommissionRows.map(r => ({
    date:   r.visits?.visit_date ?? '',
    amount: r.commission_ngn ?? 0,
  })).filter(r => r.date)
  const expenseRows   = (expensesRes.data   ?? []).map((r: { date: string; amount_ngn: number })   => ({ date: r.date, amount: r.amount_ngn   ?? 0 }))
  const penaltyRows   = (attendanceRes.data ?? []).map((r: { date: string; penalty_ngn: number }) => ({ date: r.date, amount: r.penalty_ngn  ?? 0 }))
  const varianceRows  = (reconsRes.data     ?? []).map((r: { date: string; variance_ngn: number }) => ({ date: r.date, amount: r.variance_ngn ?? 0 }))

  function netProfitFor(periodRevenue: number, fromDate: string, toDate: string): number {
    const commission = sumInRange(commissionRows, fromDate, toDate)
    const expenses   = sumInRange(expenseRows,    fromDate, toDate)
    const penalty    = sumInRange(penaltyRows,    fromDate, toDate)
    const variance   = sumInRange(varianceRows,   fromDate, toDate)
    return periodRevenue - commission - expenses + penalty + variance
  }

  const todayT = totals(todayData), weekT = totals(weekData), monthT = totals(monthData)

  return NextResponse.json({
    today:     todayT,
    yesterday: totals(yesterdayData),
    week:      weekT,
    month:     monthT,
    netProfit: {
      today: netProfitFor(todayT.revenue, today,      today),
      week:  netProfitFor(weekT.revenue,  weekStart,  today),
      month: netProfitFor(monthT.revenue, monthStart, today),
    },
  })
}
