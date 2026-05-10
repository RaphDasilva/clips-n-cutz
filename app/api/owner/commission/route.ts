import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface VSRow {
  price_ngn: number
  commission_ngn: number
  created_at: string
  users: { id: string; name: string } | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') // YYYY-MM-DD
  const to   = searchParams.get('to')   // YYYY-MM-DD

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to dates are required.' }, { status: 400 })
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('visit_services')
    .select('price_ngn, commission_ngn, created_at, users!staff_id(id, name)')
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`) as { data: VSRow[] | null; error: unknown }

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to load commission data.' }, { status: 500 })
  }

  // Aggregate by staff member
  const staffMap = new Map<string, {
    staffId: string
    staffName: string
    servicesCount: number
    totalValue: number
    totalCommission: number
  }>()

  for (const row of data) {
    const id   = row.users?.id   ?? 'unknown'
    const name = row.users?.name ?? 'Unknown Staff'

    if (!staffMap.has(id)) {
      staffMap.set(id, { staffId: id, staffName: name, servicesCount: 0, totalValue: 0, totalCommission: 0 })
    }
    const entry = staffMap.get(id)!
    entry.servicesCount  += 1
    entry.totalValue     += row.price_ngn
    entry.totalCommission += row.commission_ngn
  }

  const breakdown = [...staffMap.values()].sort((a, b) => b.totalCommission - a.totalCommission)

  const totalRevenue    = breakdown.reduce((s, r) => s + r.totalValue, 0)
  const totalCommission = breakdown.reduce((s, r) => s + r.totalCommission, 0)
  const totalServices   = breakdown.reduce((s, r) => s + r.servicesCount, 0)

  return NextResponse.json({ breakdown, totalRevenue, totalCommission, totalServices })
}
