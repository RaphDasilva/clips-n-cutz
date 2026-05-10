import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface VisitRow {
  id: string
  total_ngn: number
  visit_date: string
  clients: { name: string; phone: string } | null
  users: { name: string } | null
}

interface ServiceRow {
  price_ngn: number
  commission_ngn: number
  services: { name: string } | null
  users: { name: string } | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to dates are required.' }, { status: 400 })
  }

  const supabase = createClient()

  const [visitsRes, servicesRes] = await Promise.all([
    supabase
      .from('visits')
      .select('id, total_ngn, visit_date, clients(name, phone), users!staff_id(name)')
      .gte('visit_date', from)
      .lte('visit_date', to)
      .order('visit_date', { ascending: false }) as unknown as Promise<{ data: VisitRow[] | null; error: unknown }>,

    supabase
      .from('visit_services')
      .select('price_ngn, commission_ngn, services(name), users!staff_id(name)')
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`) as unknown as Promise<{ data: ServiceRow[] | null; error: unknown }>,
  ])

  const visits      = visitsRes.data      ?? []
  const vsRows      = servicesRes.data    ?? []

  // Totals
  const totalRevenue    = visits.reduce((s, v) => s + v.total_ngn, 0)
  const totalCommission = vsRows.reduce((s, r) => s + r.commission_ngn, 0)

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

  // Revenue by staff
  const staffMap = new Map<string, { services: number; revenue: number; commission: number }>()
  for (const r of vsRows) {
    const name = r.users?.name ?? 'Unknown'
    const cur  = staffMap.get(name) ?? { services: 0, revenue: 0, commission: 0 }
    staffMap.set(name, {
      services:   cur.services + 1,
      revenue:    cur.revenue + r.price_ngn,
      commission: cur.commission + r.commission_ngn,
    })
  }
  const byStaff = [...staffMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalCommission,
      totalVisits:   visits.length,
      totalServices: vsRows.length,
      ownerProfit:   totalRevenue - totalCommission,
    },
    byService,
    byStaff,
    visits: visits.slice(0, 50), // last 50 visits in range
  })
}
