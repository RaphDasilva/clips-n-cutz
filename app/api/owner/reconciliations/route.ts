import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ReconRow {
  id: string
  date: string
  expected_ngn: number
  actual_ngn: number
  variance_ngn: number
  notes: string | null
  recorded_at: string
  users: { name: string } | null
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const limit = Math.min(60, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? 30)))

  const { data, error } = await supabase
    .from('cash_reconciliations')
    .select('id, date, expected_ngn, actual_ngn, variance_ngn, notes, recorded_at, users:recorded_by(name)')
    .order('date', { ascending: false })
    .limit(limit) as unknown as { data: ReconRow[] | null; error: unknown }

  if (error) return NextResponse.json({ error: 'Failed to load reconciliations.' }, { status: 500 })

  const items = data ?? []
  const totalVariance = items.reduce((s, r) => s + r.variance_ngn, 0)
  const shortDays     = items.filter(r => r.variance_ngn < 0).length

  return NextResponse.json({ items, totalVariance, shortDays })
}
