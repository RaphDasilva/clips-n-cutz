import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'

function lagosToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

// GET /api/manager/reconciliation?date=YYYY-MM-DD
// Returns:
//   - expected: sum of cash-payment visits.total_ngn for the date
//   - record:   the saved reconciliation row (if any)
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? lagosToday()
  const supabase = createClient()

  const [visitsRes, recRes] = await Promise.all([
    supabase
      .from('visits')
      .select('total_ngn')
      .eq('visit_date', date)
      .eq('payment_method', 'cash') as unknown as Promise<{ data: { total_ngn: number }[] | null; error: unknown }>,
    supabase
      .from('cash_reconciliations')
      .select('*')
      .eq('date', date)
      .maybeSingle() as unknown as Promise<{ data: { id: string; expected_ngn: number; actual_ngn: number; variance_ngn: number; notes: string | null; recorded_at: string; recorded_by: string | null } | null; error: unknown }>,
  ])

  const expected = (visitsRes.data ?? []).reduce((s, r) => s + r.total_ngn, 0)

  return NextResponse.json({
    date,
    expected,
    visitCount: visitsRes.data?.length ?? 0,
    record:     recRes.data,
  })
}

// POST /api/manager/reconciliation
// Body: { date?, actualNgn, notes? }
// Recomputes expected server-side and upserts.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const date = (typeof body.date === 'string' ? body.date : lagosToday())
  const actualNgn = Math.max(0, Math.round(Number(body.actualNgn) || 0))
  const notes     = typeof body.notes === 'string' ? body.notes.trim() || null : null

  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  const recordedBy = session?.id ?? null

  const supabase = createClient()

  const { data: visits, error: vErr } = await supabase
    .from('visits')
    .select('total_ngn')
    .eq('visit_date', date)
    .eq('payment_method', 'cash') as unknown as { data: { total_ngn: number }[] | null; error: unknown }

  if (vErr) return NextResponse.json({ error: 'Failed to compute expected cash.' }, { status: 500 })

  const expected = (visits ?? []).reduce((s, r) => s + r.total_ngn, 0)
  const variance = actualNgn - expected

  const { data, error } = await supabase
    .from('cash_reconciliations')
    .upsert({
      date,
      expected_ngn: expected,
      actual_ngn:   actualNgn,
      variance_ngn: variance,
      notes,
      recorded_at:  new Date().toISOString(),
      recorded_by:  recordedBy,
    }, { onConflict: 'date' })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to save reconciliation.' }, { status: 500 })
  }

  return NextResponse.json({ record: data })
}
