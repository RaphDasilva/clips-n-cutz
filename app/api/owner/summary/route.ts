import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isLocalRequest, isDemoStaffName } from '@/lib/env'

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

interface VisitRow { total_ngn: number; tip_ngn: number; payment_method: string; users?: { name: string } | null }
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
  const showDemo = await isLocalRequest()

  const today      = lagosDateStr()
  const yesterday  = lagosDateStr(-1)
  const weekStart  = lagosWeekStart()
  const monthStart = lagosMonthStart()

  const visitCols = 'total_ngn, tip_ngn, payment_method, users!staff_id(name)'

  const [todayRes, yesterdayRes, weekRes, monthRes, commissionRes, expensesRes, attendanceRes, reconsRes] = await Promise.all([
    supabase.from('visits').select(visitCols).eq('visit_date', today),
    supabase.from('visits').select(visitCols).eq('visit_date', yesterday),
    supabase.from('visits').select(visitCols).gte('visit_date', weekStart).lte('visit_date', today),
    supabase.from('visits').select(visitCols).gte('visit_date', monthStart).lte('visit_date', today),

    // Commission + attendance joined to users so we can hide demo staff
    // (e.g. TEST*) from production aggregates.
    supabase.from('visit_services').select('commission_ngn, visits!inner(visit_date), users!staff_id(name)')
      .gte('visits.visit_date', monthStart).lte('visits.visit_date', today),

    supabase.from('expenses').select('date, amount_ngn').gte('date', monthStart).lte('date', today),
    supabase.from('attendance').select('date, penalty_ngn, users!staff_id(name)').gte('date', monthStart).lte('date', today),
    supabase.from('cash_reconciliations').select('date, variance_ngn').gte('date', monthStart).lte('date', today),
  ])

  const keepVisit = (v: VisitRow) => showDemo || !isDemoStaffName(v.users?.name)
  const todayData     = ((todayRes.data     ?? []) as unknown as VisitRow[]).filter(keepVisit)
  const yesterdayData = ((yesterdayRes.data ?? []) as unknown as VisitRow[]).filter(keepVisit)
  const weekData      = ((weekRes.data      ?? []) as unknown as VisitRow[]).filter(keepVisit)
  const monthData     = ((monthRes.data     ?? []) as unknown as VisitRow[]).filter(keepVisit)

  const rawCommissionRows = (commissionRes.data ?? []) as unknown as Array<{ commission_ngn: number; visits: { visit_date: string } | null; users: { name: string } | null }>
  const commissionRows = rawCommissionRows
    .filter(r => showDemo || !isDemoStaffName(r.users?.name))
    .map(r => ({ date: r.visits?.visit_date ?? '', amount: r.commission_ngn ?? 0 }))
    .filter(r => r.date)
  const expenseRows   = (expensesRes.data ?? []).map((r: { date: string; amount_ngn: number }) => ({ date: r.date, amount: r.amount_ngn ?? 0 }))
  const rawPenaltyRows = (attendanceRes.data ?? []) as unknown as Array<{ date: string; penalty_ngn: number; users: { name: string } | null }>
  const penaltyRows   = rawPenaltyRows
    .filter(r => showDemo || !isDemoStaffName(r.users?.name))
    .map(r => ({ date: r.date, amount: r.penalty_ngn ?? 0 }))
  const varianceRows  = (reconsRes.data ?? []).map((r: { date: string; variance_ngn: number }) => ({ date: r.date, amount: r.variance_ngn ?? 0 }))

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
