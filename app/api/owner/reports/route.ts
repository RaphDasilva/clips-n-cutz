import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface VisitRow {
  id: string
  total_ngn: number
  tip_ngn: number
  visit_date: string
  payment_method: string
  staff_id: string | null
  clients: { name: string; phone: string | null } | null
  users: { name: string } | null
}

interface ServiceRow {
  price_ngn: number
  commission_ngn: number
  tip_ngn: number
  services: { name: string } | null
  users: { name: string } | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from    = searchParams.get('from')
  const to      = searchParams.get('to')
  const payment = searchParams.get('payment') // 'cash' | 'transfer' | 'pos' | null (all)

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to dates are required.' }, { status: 400 })
  }

  const supabase = createClient()

  let visitsQuery = supabase
    .from('visits')
    .select('id, total_ngn, tip_ngn, visit_date, payment_method, staff_id, clients(name, phone), users!staff_id(name)')
    .gte('visit_date', from)
    .lte('visit_date', to)
    .order('visit_date', { ascending: false })

  if (payment && ['cash', 'transfer', 'pos'].includes(payment)) {
    visitsQuery = visitsQuery.eq('payment_method', payment)
  }

  const [visitsRes, servicesRes] = await Promise.all([
    visitsQuery as unknown as Promise<{ data: VisitRow[] | null; error: unknown }>,

    supabase
      .from('visit_services')
      .select('price_ngn, commission_ngn, tip_ngn, services(name), users!staff_id(name)')
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`) as unknown as Promise<{ data: ServiceRow[] | null; error: unknown }>,
  ])

  const visits      = visitsRes.data      ?? []
  const vsRows      = servicesRes.data    ?? []

  // Totals
  const totalRevenue    = visits.reduce((s, v) => s + v.total_ngn, 0)
  const totalCommission = vsRows.reduce((s, r) => s + r.commission_ngn, 0)
  const totalTips       = visits.reduce((s, v) => s + (v.tip_ngn ?? 0), 0)
  const totalPayout     = totalCommission + totalTips

  // Payment method breakdown
  const byPayment = { cash: 0, transfer: 0, pos: 0 }
  for (const v of visits) {
    if (v.payment_method === 'cash')     byPayment.cash     += v.total_ngn
    else if (v.payment_method === 'transfer') byPayment.transfer += v.total_ngn
    else if (v.payment_method === 'pos') byPayment.pos      += v.total_ngn
  }

  // Revenue by service name
  const serviceMap = new Map<string, { count: number; revenue: number }>()
  for (const r of vsRows) {
    const name = r.services?.name ?? 'Unknown'
    const cur  = serviceMap.get(name) ?? { count: 0, revenue: 0 }
    serviceMap.set(name, { count: cur.count + 1, revenue: cur.revenue + r.price_ngn })
  }
  const byService = [...serviceMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)

  // Revenue by staff — commission AND tips both come from
  // visit_services (per-line). Tips can now differ from
  // visits.staff_id if multiple staff worked one visit.
  const staffMap = new Map<string, { services: number; revenue: number; commission: number; tips: number }>()
  for (const r of vsRows) {
    const name = r.users?.name ?? 'Unknown'
    const cur  = staffMap.get(name) ?? { services: 0, revenue: 0, commission: 0, tips: 0 }
    staffMap.set(name, {
      services:   cur.services + 1,
      revenue:    cur.revenue + r.price_ngn,
      commission: cur.commission + r.commission_ngn,
      tips:       cur.tips + (r.tip_ngn ?? 0),
    })
  }
  const byStaff = [...staffMap.entries()]
    .map(([name, v]) => ({ name, ...v, totalPayout: v.commission + v.tips }))
    .sort((a, b) => b.revenue - a.revenue)

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalCommission,
      totalTips,
      totalPayout,
      totalVisits:   visits.length,
      totalServices: vsRows.length,
      ownerProfit:   totalRevenue - totalCommission,
    },
    byPayment,
    byService,
    byStaff,
    visits: visits.slice(0, 50), // last 50 visits in range
  })
}
