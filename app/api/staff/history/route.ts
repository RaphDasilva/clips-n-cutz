import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface VSRow {
  visit_id: string
  commission_ngn: number
  price_ngn: number
  created_at: string
  services: { name: string } | null
  visits: {
    visit_date: string
    tip_ngn: number
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
    .select('visit_id, commission_ngn, price_ngn, created_at, services(name), visits(visit_date, tip_ngn, clients(name))')
    .eq('staff_id', staffId)
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .order('created_at', { ascending: false }) as unknown as { data: VSRow[] | null; error: unknown }

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to load history.' }, { status: 500 })
  }

  const totalCommission = data.reduce((s, r) => s + r.commission_ngn, 0)
  const totalServices   = data.length

  // Sum tips once per unique visit
  const seenVisits  = new Set<string>()
  const totalTips   = data.reduce((sum, r) => {
    if (!r.visit_id || seenVisits.has(r.visit_id)) return sum
    seenVisits.add(r.visit_id)
    return sum + (r.visits?.tip_ngn ?? 0)
  }, 0)

  // Group by visit date
  const byDate = new Map<string, {
    date: string
    entries: { serviceName: string; clientName: string; earnings: number; price: number }[]
    tip: number
    dayEarnings: number
    seenVisits: Set<string>
  }>()

  for (const row of data) {
    const date   = row.visits?.visit_date ?? row.created_at.split('T')[0]
    const client = row.visits?.clients?.name ?? 'Unknown'
    const svc    = row.services?.name ?? 'Unknown service'

    if (!byDate.has(date)) {
      byDate.set(date, { date, entries: [], tip: 0, dayEarnings: 0, seenVisits: new Set() })
    }
    const group = byDate.get(date)!
    group.entries.push({ serviceName: svc, clientName: client, earnings: row.commission_ngn, price: row.price_ngn })
    group.dayEarnings += row.commission_ngn

    // Add tip once per visit per day
    if (row.visit_id && !group.seenVisits.has(row.visit_id)) {
      group.seenVisits.add(row.visit_id)
      const tip = row.visits?.tip_ngn ?? 0
      group.tip         += tip
      group.dayEarnings += tip
    }
  }

  const grouped = [...byDate.values()]
    .map(({ seenVisits: _, ...rest }) => rest)
    .sort((a, b) => b.date.localeCompare(a.date))

  return NextResponse.json({ totalEarnings: totalCommission + totalTips, totalCommission, totalTips, totalServices, grouped })
}
