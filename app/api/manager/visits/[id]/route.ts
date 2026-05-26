import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'

// Delete a visit. Same-day only — historical data is locked
// against accidental edits that would corrupt past payouts.
// Before deleting we snapshot the visit into visit_deletions so
// the owner can audit who removed what (and why).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({})) as { reason?: string; reasonNote?: string }
  const reason     = typeof body.reason     === 'string' ? body.reason.slice(0, 40) : null
  const reasonNote = typeof body.reasonNote === 'string' ? body.reasonNote.trim().slice(0, 500) || null : null

  const supabase = createClient()

  const { data: visit, error: lookupErr } = await supabase
    .from('visits')
    .select(`
      id, visit_date, appointment_id, total_ngn, tip_ngn, payment_method,
      clients(name, phone),
      users!staff_id(name),
      visit_services(services(name))
    `)
    .eq('id', id)
    .single() as { data: {
      id: string; visit_date: string; appointment_id: string | null
      total_ngn: number; tip_ngn: number; payment_method: string
      clients: { name: string; phone: string | null } | null
      users:   { name: string } | null
      visit_services: { services: { name: string } | null }[]
    } | null; error: unknown }

  if (lookupErr || !visit) {
    return NextResponse.json({ error: 'Visit not found.' }, { status: 404 })
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  if (visit.visit_date !== today) {
    return NextResponse.json(
      { error: 'Only today’s visits can be removed. Older entries are locked to protect payout history.' },
      { status: 403 }
    )
  }

  // Who's deleting (for audit)
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  const deletedBy = session?.id ?? null

  const serviceNames = (visit.visit_services ?? [])
    .map(s => s.services?.name)
    .filter((n): n is string => Boolean(n))

  // 1) Snapshot first — if this fails we abort the delete
  const { error: snapErr } = await supabase.from('visit_deletions').insert({
    original_visit_id: visit.id,
    client_name:       visit.clients?.name  ?? null,
    client_phone:      visit.clients?.phone ?? null,
    staff_name:        visit.users?.name    ?? null,
    visit_date:        visit.visit_date,
    total_ngn:         visit.total_ngn,
    tip_ngn:           visit.tip_ngn ?? 0,
    payment_method:    visit.payment_method,
    service_names:     serviceNames,
    reason,
    reason_note:       reasonNote,
    deleted_by:        deletedBy,
  })
  if (snapErr) return NextResponse.json({ error: 'Failed to record audit entry.' }, { status: 500 })

  // 2) Cascade delete in dependency order
  const fuRes = await supabase.from('follow_ups').delete().eq('visit_id', id)
  if (fuRes.error) return NextResponse.json({ error: 'Failed to clean up follow-ups.' }, { status: 500 })

  const vsRes = await supabase.from('visit_services').delete().eq('visit_id', id)
  if (vsRes.error) return NextResponse.json({ error: 'Failed to remove visit services.' }, { status: 500 })

  if (visit.appointment_id) {
    await supabase
      .from('appointments')
      .update({ status: 'confirmed', staff_id: null, updated_at: new Date().toISOString() })
      .eq('id', visit.appointment_id)
  }

  const vRes = await supabase.from('visits').delete().eq('id', id)
  if (vRes.error) return NextResponse.json({ error: 'Failed to remove the visit.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
