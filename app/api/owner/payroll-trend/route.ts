import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PayoutRow {
  week_start: string
  commission_ngn: number
  tips_ngn: number
  penalty_ngn: number
  total_ngn: number
}

// Returns the weekly total payroll for the last N weeks (paid only).
// Used by the owner home and payouts page to show trend.
export async function GET(req: NextRequest) {
  const weeks = Math.min(52, Math.max(1, Number(req.nextUrl.searchParams.get('weeks') ?? 12)))

  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff_payouts')
    .select('week_start, commission_ngn, tips_ngn, penalty_ngn, total_ngn')
    .order('week_start', { ascending: false }) as unknown as { data: PayoutRow[] | null; error: unknown }

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to load payroll trend.' }, { status: 500 })
  }

  // Group by week_start
  const map = new Map<string, { commission: number; tips: number; penalty: number; total: number }>()
  for (const row of data) {
    const cur = map.get(row.week_start) ?? { commission: 0, tips: 0, penalty: 0, total: 0 }
    map.set(row.week_start, {
      commission: cur.commission + (row.commission_ngn ?? 0),
      tips:       cur.tips       + (row.tips_ngn       ?? 0),
      penalty:    cur.penalty    + (row.penalty_ngn    ?? 0),
      total:      cur.total      + (row.total_ngn      ?? 0),
    })
  }

  const points = [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-weeks)
    .map(([week, v]) => ({
      week,
      label: new Date(week + 'T12:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
      ...v,
    }))

  return NextResponse.json({ points })
}
