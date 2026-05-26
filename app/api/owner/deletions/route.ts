import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface DeletionRow {
  id: string
  original_visit_id: string
  client_name: string | null
  client_phone: string | null
  staff_name: string | null
  visit_date: string
  total_ngn: number
  tip_ngn: number
  payment_method: string | null
  service_names: string[]
  reason: string | null
  reason_note: string | null
  deleted_at: string
  acknowledged_at: string | null
  users: { name: string } | null
}

// Owner view of visit deletions performed by managers.
// Query params:
//   ?unack=true        — only entries not yet acknowledged
//   ?limit=20          — cap (default 50, max 200)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const onlyUnack = req.nextUrl.searchParams.get('unack') === 'true'
  const limit     = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? 50)))

  let query = supabase
    .from('visit_deletions')
    .select('id, original_visit_id, client_name, client_phone, staff_name, visit_date, total_ngn, tip_ngn, payment_method, service_names, reason, reason_note, deleted_at, acknowledged_at, users:deleted_by(name)')
    .order('deleted_at', { ascending: false })
    .limit(limit)

  if (onlyUnack) query = query.is('acknowledged_at', null)

  const { data, error } = await query as unknown as { data: DeletionRow[] | null; error: unknown }

  if (error) {
    return NextResponse.json({ error: 'Failed to load deletions.' }, { status: 500 })
  }

  return NextResponse.json({ deletions: data ?? [] })
}
