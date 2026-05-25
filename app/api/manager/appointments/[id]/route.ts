import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/types/database'

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status } = await req.json()

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// Called when the client arrives — assigns staff and creates the visit record
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body          = await req.json()
  const serviceIds    = (Array.isArray(body.serviceIds) ? body.serviceIds : []) as string[]
  const staffByService: Record<string, string> = body.staffByService ?? {}
  const tipByStaff:     Record<string, string | number> = body.tipByStaff ?? {}
  const paymentMethod = ['cash', 'transfer', 'pos'].includes(body.paymentMethod)
    ? (body.paymentMethod as string)
    : 'cash'

  if (serviceIds.length === 0) {
    return NextResponse.json({ error: 'Please select at least one service.' }, { status: 400 })
  }
  const unassigned = serviceIds.find(sid => !staffByService[sid])
  if (unassigned) {
    return NextResponse.json(
      { error: 'Every service must be assigned to a staff member.' },
      { status: 400 }
    )
  }

  // Normalise tips
  const tipsByStaff = new Map<string, number>()
  for (const [staffId, raw] of Object.entries(tipByStaff)) {
    const n = Math.max(0, parseInt(String(raw), 10) || 0)
    if (n > 0) tipsByStaff.set(staffId, n)
  }

  const supabase = createClient()

  // Fetch appointment for client_id and status check
  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .select('id, client_id, status')
    .eq('id', id)
    .single() as { data: { id: string; client_id: string; status: string } | null; error: unknown }

  if (apptErr || !appt) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })
  if (appt.status === 'completed') return NextResponse.json({ error: 'This appointment has already been checked in.' }, { status: 400 })

  const { data: services, error: svErr } = await supabase
    .from('services').select('id, name, price_ngn').in('id', serviceIds) as { data: Pick<Service, 'id' | 'name' | 'price_ngn'>[] | null; error: unknown }
  if (svErr || !services?.length) return NextResponse.json({ error: 'Could not load service data.' }, { status: 500 })

  const totalNgn    = services.reduce((sum, s) => sum + s.price_ngn, 0)
  const totalTipNgn = Array.from(tipsByStaff.values()).reduce((s, n) => s + n, 0)
  const visitDate   = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const primaryStaffId = staffByService[serviceIds[0]]

  const { data: visit, error: visitErr } = await supabase
    .from('visits')
    .insert({
      client_id:      appt.client_id,
      staff_id:       primaryStaffId,
      appointment_id: id,
      visit_date:     visitDate,
      total_ngn:      totalNgn,
      tip_ngn:        totalTipNgn,
      payment_method: paymentMethod,
    })
    .select()
    .single() as { data: { id: string } | null; error: unknown }

  if (visitErr || !visit) return NextResponse.json({ error: 'Failed to create visit record.' }, { status: 500 })

  // Per-line writes — each service gets its own staff_id and an
  // optional tip drop (whole staff tip lands on first line for
  // that staff).
  const tipsPlaced = new Set<string>()
  const serviceById = new Map(services.map(s => [s.id, s]))
  const vsRows = serviceIds.map(sid => {
    const s       = serviceById.get(sid)!
    const staffId = staffByService[sid]
    const tip     = !tipsPlaced.has(staffId) && tipsByStaff.has(staffId)
      ? tipsByStaff.get(staffId)!
      : 0
    if (tip > 0) tipsPlaced.add(staffId)
    return {
      visit_id:       visit.id,
      service_id:     s.id,
      staff_id:       staffId,
      price_ngn:      s.price_ngn,
      commission_ngn: Math.round(s.price_ngn * 0.3),
      tip_ngn:        tip,
    }
  })

  const { error: vsErr } = await supabase.from('visit_services').insert(vsRows)
  if (vsErr) return NextResponse.json({ error: 'Failed to save services.' }, { status: 500 })

  await supabase
    .from('appointments')
    .update({ status: 'completed', staff_id: primaryStaffId, updated_at: new Date().toISOString() })
    .eq('id', id)

  const followUp = new Date()
  followUp.setDate(followUp.getDate() + 7)
  await supabase.from('follow_ups').insert({ client_id: appt.client_id, visit_id: visit.id, scheduled_for: followUp.toISOString() })

  return NextResponse.json({ success: true, visitId: visit.id, totalNgn, tipNgn: totalTipNgn })
}
