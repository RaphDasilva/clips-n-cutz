import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

// Called when the client arrives — assigns a staff member and creates the visit record
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { staffId } = await req.json()

  if (!staffId) return NextResponse.json({ error: 'Please select a staff member.' }, { status: 400 })

  const supabase = createClient()

  // Fetch appointment with client and booked services
  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .select('id, client_id, status, appointment_services(service_id, services(id, name, price_ngn))')
    .eq('id', id)
    .single() as {
      data: {
        id: string
        client_id: string
        status: string
        appointment_services: { service_id: string; services: { id: string; name: string; price_ngn: number } | null }[]
      } | null
      error: unknown
    }

  if (apptErr || !appt) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })
  if (appt.status === 'completed') return NextResponse.json({ error: 'This appointment has already been checked in.' }, { status: 400 })

  const services = appt.appointment_services.map(s => s.services).filter(Boolean) as { id: string; name: string; price_ngn: number }[]
  if (services.length === 0) return NextResponse.json({ error: 'No services found on this appointment.' }, { status: 400 })

  const totalNgn  = services.reduce((sum, s) => sum + s.price_ngn, 0)
  const visitDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })

  // Create the visit record
  const { data: visit, error: visitErr } = await supabase
    .from('visits')
    .insert({ client_id: appt.client_id, staff_id: staffId, appointment_id: id, visit_date: visitDate, total_ngn: totalNgn })
    .select()
    .single() as { data: { id: string } | null; error: unknown }

  if (visitErr || !visit) return NextResponse.json({ error: 'Failed to create visit record.' }, { status: 500 })

  // Create one visit_service row per service with 30% commission
  const { error: vsErr } = await supabase.from('visit_services').insert(
    services.map(s => ({
      visit_id:       visit.id,
      service_id:     s.id,
      staff_id:       staffId,
      price_ngn:      s.price_ngn,
      commission_ngn: Math.round(s.price_ngn * 0.3),
    }))
  )
  if (vsErr) return NextResponse.json({ error: 'Failed to save services.' }, { status: 500 })

  // Mark appointment completed and record which staff handled it
  await supabase
    .from('appointments')
    .update({ status: 'completed', staff_id: staffId, updated_at: new Date().toISOString() })
    .eq('id', id)

  // Schedule 7-day follow-up
  const followUp = new Date()
  followUp.setDate(followUp.getDate() + 7)
  await supabase.from('follow_ups').insert({ client_id: appt.client_id, visit_id: visit.id, scheduled_for: followUp.toISOString() })

  return NextResponse.json({ success: true, visitId: visit.id, totalNgn })
}
