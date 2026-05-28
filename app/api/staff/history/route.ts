import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface VSRow {
  visit_id: string
  commission_ngn: number
  price_ngn: number
  material_cost_ngn: number
  tip_ngn: number
  created_at: string
  services: { name: string } | null
  visits: {
    visit_date: string
    clients: { name: string } | null
  } | null
}

export async function GET(req: NextRequest) {
  const params   = new URL(req.url).searchParams
  const staffId  = params.get('staffId')
  const from     = params.get('from')
  const to       = params.get('to')

  if (!staffId || !from || !to) {
    return NextResponse.json({ error: 'staffId, from, and to are required.' }, { status: 400 })
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('visit_services')
    .select('visit_id, commission_ngn, price_ngn, material_cost_ngn, tip_ngn, created_at, services(name), visits(visit_date, clients(name))')
    .eq('staff_id', staffId)
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .order('created_at', { ascending: false }) as unknown as { data: VSRow[] | null; error: unknown }

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to load history.' }, { status: 500 })
  }

  const totalCommission = data.reduce((s, r) => s + r.commission_ngn, 0)
  const totalServices   = data.length
  const totalTips       = data.reduce((s, r) => s + (r.tip_ngn ?? 0), 0)

  // Group by visit date
  const byDate = new Map<string, {
    date: string
    entries: { serviceName: string; clientName: string; earnings: number; price: number; materialCost: number }[]
    tip: number
    dayEarnings: number
  }>()

  for (const row of data) {
    const date   = row.visits?.visit_date ?? row.created_at.split('T')[0]
    const client = row.visits?.clients?.name ?? 'Unknown'
    const svc    = row.services?.name ?? 'Unknown service'
    const tip    = row.tip_ngn ?? 0

    if (!byDate.has(date)) {
      byDate.set(date, { date, entries: [], tip: 0, dayEarnings: 0 })
    }
    const group = byDate.get(date)!
    group.entries.push({ serviceName: svc, clientName: client, earnings: row.commission_ngn, price: row.price_ngn, materialCost: row.material_cost_ngn ?? 0 })
    group.dayEarnings += row.commission_ngn + tip
    group.tip         += tip
  }

  const grouped = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))

  return NextResponse.json({ totalEarnings: totalCommission + totalTips, totalCommission, totalTips, totalServices, grouped })
}
