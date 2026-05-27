import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isLocalRequest, isDemoStaffName } from '@/lib/env'

interface TipRow {
  staff_id: string
  tip_ngn: number
  users: { name: string } | null
  visits: { visit_date: string } | null
}

// Manager-visible tip aggregation per staff.
// Returns tip totals ONLY — no commission breakdown (CLAUDE.md
// prohibits manager from seeing commission calculations).

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') // YYYY-MM-DD
  const to   = searchParams.get('to')   // YYYY-MM-DD

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to dates are required.' }, { status: 400 })
  }

  const supabase = createClient()
  const showDemo = await isLocalRequest()

  const { data, error } = await supabase
    .from('visit_services')
    .select('staff_id, tip_ngn, users!staff_id(name), visits!inner(visit_date)')
    .gte('visits.visit_date', from)
    .lte('visits.visit_date', to) as unknown as { data: TipRow[] | null; error: unknown }

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to load tips data.' }, { status: 500 })
  }

  const map = new Map<string, { staffId: string; staffName: string; tips: number }>()

  for (const row of data) {
    const id = row.staff_id
    if (!id) continue
    if (!showDemo && isDemoStaffName(row.users?.name)) continue
    if (!map.has(id)) {
      map.set(id, { staffId: id, staffName: row.users?.name ?? 'Unknown', tips: 0 })
    }
    map.get(id)!.tips += row.tip_ngn ?? 0
  }

  const breakdown = [...map.values()]
    .filter(r => r.tips > 0)
    .sort((a, b) => b.tips - a.tips)

  const totalTips = breakdown.reduce((s, r) => s + r.tips, 0)

  return NextResponse.json({ breakdown, totalTips })
}
