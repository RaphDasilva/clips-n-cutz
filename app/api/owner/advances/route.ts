import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'
import { isLocalRequest, DEMO_STAFF_PREFIX } from '@/lib/env'

interface AdvanceRow {
  id:                 string
  staff_id:           string
  amount_ngn:         number
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
// Returns the raw list plus a per-staff outstanding rollup.
export async function GET(req: NextRequest) {
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient()
  const showDemo = await isLocalRequest()
  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staffId')
  const status  = searchParams.get('status')

  let q = supabase
    .from('staff_advances')
    .select('id, staff_id, amount_ngn, reason, given_at, given_by, status, deducted_at, deducted_payout_id, created_at, users!staff_id(name)')
    .order('given_at', { ascending: false })
  if (staffId) q = q.eq('staff_id', staffId)
  if (status)  q = q.eq('status',   status)

  const { data, error } = await q as unknown as { data: AdvanceRow[] | null; error: { message: string } | null }
  if (error) return NextResponse.json({ error: 'Failed to load advances.' }, { status: 500 })

  const rows = (data ?? []).filter(r => showDemo || !(r.users?.name ?? '').toUpperCase().startsWith(DEMO_STAFF_PREFIX))

  // Outstanding per staff.
  const outstandingByStaff = new Map<string, { staffId: string; staffName: string; outstanding: number }>()
  for (const r of rows) {
    if (r.status !== 'outstanding') continue
    const key = r.staff_id
    if (!outstandingByStaff.has(key)) {
      outstandingByStaff.set(key, { staffId: key, staffName: r.users?.name ?? 'Unknown', outstanding: 0 })
    }
    outstandingByStaff.get(key)!.outstanding += r.amount_ngn
  }

  return NextResponse.json({
    advances:    rows,
    outstanding: [...outstandingByStaff.values()].sort((a, b) => b.outstanding - a.outstanding),
  })
}

// POST /api/owner/advances
// Body: { staffId, amountNgn, reason? }
// Records a new outstanding advance against a staff member.
export async function POST(req: NextRequest) {
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.actualRole ?? session.role
  if (role !== 'owner' && role !== 'manager') {
    return NextResponse.json({ error: 'Only owner or manager can issue advances.' }, { status: 403 })
  }

  const body         = await req.json()
  const staffId      = typeof body.staffId   === 'string' ? body.staffId.trim() : ''
  const amountNgn    = Number(body.amountNgn)
  const reason       = typeof body.reason === 'string' ? body.reason.trim() || null : null

  if (!staffId || !Number.isFinite(amountNgn) || amountNgn <= 0) {
    return NextResponse.json({ error: 'Staff and a positive amount are required.' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff_advances')
    .insert({
      staff_id:   staffId,
      amount_ngn: Math.round(amountNgn),
      reason,
      given_by:   session.id,
    })
    .select('id, staff_id, amount_ngn, reason, given_at, status')
    .single() as { data: { id: string; staff_id: string; amount_ngn: number; reason: string | null; given_at: string; status: string } | null; error: { message: string } | null }

  if (error || !data) return NextResponse.json({ error: 'Failed to record advance.' }, { status: 500 })
  return NextResponse.json({ advance: data }, { status: 201 })
}
