import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Delete a visit. Same-day only — historical data is locked
// against accidental edits that would corrupt past payouts.
// Cascades to visit_services and follow_ups for the visit.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const { data: visit, error: lookupErr } = await supabase
    .from('visits')
    .select('id, visit_date, appointment_id')
    .eq('id', id)
    .single() as { data: { id: string; visit_date: string; appointment_id: string | null } | null; error: unknown }

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

  // Cascade in dependency order
  const fuRes = await supabase.from('follow_ups').delete().eq('visit_id', id)
  if (fuRes.error) return NextResponse.json({ error: 'Failed to clean up follow-ups.' }, { status: 500 })

  const vsRes = await supabase.from('visit_services').delete().eq('visit_id', id)
  if (vsRes.error) return NextResponse.json({ error: 'Failed to remove visit services.' }, { status: 500 })

  // If this visit came from an appointment, flip the appointment
  // back to 'confirmed' so the manager can re-check-in correctly
  // (without it, the appointment is stuck at 'completed').
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
