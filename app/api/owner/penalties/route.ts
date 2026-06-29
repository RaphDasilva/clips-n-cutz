import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'
import { isLocalRequest, DEMO_STAFF_PREFIX } from '@/lib/env'

interface PenaltyRow {
  id:          string
  staff_id:    string
  amount_ngn:  number
  reason:      string
  given_at:    string
  given_by:    string | null
  status:      'active' | 'reversed'
  reversed_at: string | null
  created_at:  string
  users:       { name: string } | null
}

// Owner read-only — penalty lifecycle (create, reverse) belongs to
// the manager via /api/manager/penalties.
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
    .from('manual_penalties')
    .select('id, staff_id, amount_ngn, reason, given_at, given_by, status, reversed_at, created_at, users!staff_id(name)')
    .order('given_at', { ascending: false })
  if (staffId) q = q.eq('staff_id', staffId)
  if (status)  q = q.eq('status',   status)

  const { data, error } = await q as unknown as { data: PenaltyRow[] | null; error: { message: string } | null }
  if (error) return NextResponse.json({ error: 'Failed to load penalties.' }, { status: 500 })

  const rows = (data ?? []).filter(r => showDemo || !(r.users?.name ?? '').toUpperCase().startsWith(DEMO_STAFF_PREFIX))

  const byStaff = new Map<string, { staffId: string; staffName: string; activeTotal: number }>()
  for (const r of rows) {
    if (r.status !== 'active') continue
    if (!byStaff.has(r.staff_id)) {
      byStaff.set(r.staff_id, { staffId: r.staff_id, staffName: r.users?.name ?? 'Unknown', activeTotal: 0 })
    }
    byStaff.get(r.staff_id)!.activeTotal += r.amount_ngn
  }

  return NextResponse.json({
    penalties:    rows,
    activeByStaff: [...byStaff.values()].sort((a, b) => b.activeTotal - a.activeTotal),
  })
}
