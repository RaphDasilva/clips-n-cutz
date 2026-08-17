import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'
import { isLocalRequest, DEMO_STAFF_PREFIX } from '@/lib/env'
import { advanceRemaining, advanceWeeklyDeduction } from '@/lib/advances'

interface AdvanceRow {
  id:                 string
  staff_id:           string
  amount_ngn:         number
  repaid_ngn:         number
  weekly_cap_ngn:     number | null
  reason:             string | null
  given_at:           string
  given_by:           string | null
  status:             'outstanding' | 'deducted' | 'forgiven'
  deducted_at:        string | null
  deducted_payout_id: string | null
  created_at:         string
  users:              { name: string } | null
}

// GET /api/owner/advances
//   ?staffId=<uuid>      filter to one staff member
//   ?status=outstanding  filter by lifecycle status
// Returns the raw list, a per-staff outstanding rollup, and the active
// staff list (for the owner's grant form).
export async function GET(req: NextRequest) {
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient()
  const showDemo = await isLocalRequest()
  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staffId')
  const status  = searchParams.get('status')

  let staffQ = supabase
    .from('users')
    .select('id, name')
    .eq('role', 'staff')
    .eq('is_active', true)
  if (!showDemo) staffQ = staffQ.not('name', 'ilike', `${DEMO_STAFF_PREFIX}%`)

  let q = supabase
    .from('staff_advances')
    .select('id, staff_id, amount_ngn, repaid_ngn, weekly_cap_ngn, reason, given_at, given_by, status, deducted_at, deducted_payout_id, created_at, users!staff_id(name)')
    .order('given_at', { ascending: false })
  if (staffId) q = q.eq('staff_id', staffId)
  if (status)  q = q.eq('status',   status)

  const [{ data, error }, staffRes] = await Promise.all([
    q as unknown as Promise<{ data: AdvanceRow[] | null; error: { message: string } | null }>,
    staffQ.order('name') as unknown as Promise<{ data: { id: string; name: string }[] | null; error: unknown }>,
  ])
  if (error) return NextResponse.json({ error: 'Failed to load advances.' }, { status: 500 })

  const rows = (data ?? []).filter(r => showDemo || !(r.users?.name ?? '').toUpperCase().startsWith(DEMO_STAFF_PREFIX))

  // Outstanding per staff — remaining balances, plus what next Sunday's
  // payout will actually deduct once payment plans are applied.
  const outstandingByStaff = new Map<string, { staffId: string; staffName: string; outstanding: number; nextDeduction: number }>()
  for (const r of rows) {
    if (r.status !== 'outstanding') continue
    const key = r.staff_id
    if (!outstandingByStaff.has(key)) {
      outstandingByStaff.set(key, { staffId: key, staffName: r.users?.name ?? 'Unknown', outstanding: 0, nextDeduction: 0 })
    }
    const entry = outstandingByStaff.get(key)!
    entry.outstanding   += advanceRemaining(r)
    entry.nextDeduction += advanceWeeklyDeduction(r)
  }

  return NextResponse.json({
    advances:    rows,
    outstanding: [...outstandingByStaff.values()].sort((a, b) => b.outstanding - a.outstanding),
    staff:       staffRes.data ?? [],
  })
}

// POST — owner grants a new advance (it's their money, after all).
// Forgiving and editing still live with the manager, who runs the till.
export async function POST(req: NextRequest) {
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body      = await req.json()
  const staffId   = typeof body.staffId   === 'string' ? body.staffId.trim() : ''
  const amountNgn = Number(body.amountNgn)
  const reason    = typeof body.reason === 'string' ? body.reason.trim() || null : null
  const rawCap    = body.weeklyCapNgn
  const weeklyCap = rawCap === null || rawCap === undefined || rawCap === '' ? null : Math.round(Number(rawCap) || 0)

  if (!staffId || !Number.isFinite(amountNgn) || amountNgn <= 0) {
    return NextResponse.json({ error: 'Staff and a positive amount are required.' }, { status: 400 })
  }
  if (weeklyCap !== null && weeklyCap <= 0) {
    return NextResponse.json({ error: 'Weekly deduction must be above ₦0, or left empty.' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff_advances')
    .insert({
      staff_id:       staffId,
      amount_ngn:     Math.round(amountNgn),
      weekly_cap_ngn: weeklyCap,
      reason,
      given_by:       session.id,
    })
    .select('id, staff_id, amount_ngn, reason, given_at, status')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error || !data) return NextResponse.json({ error: 'Failed to record advance.' }, { status: 500 })
  return NextResponse.json({ advance: data }, { status: 201 })
}
