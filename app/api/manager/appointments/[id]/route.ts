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

interface Line { serviceId: string; staffId: string }

// Called when the client arrives — assigns staff and creates the visit record
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body   = await req.json()
  const rawLines = Array.isArray(body.lines) ? body.lines : []
  const lines: Line[] = rawLines
    .map((l: { serviceId?: unknown; staffId?: unknown }) => ({
      serviceId: typeof l.serviceId === 'string' ? l.serviceId : '',
      staffId:   typeof l.staffId   === 'string' ? l.staffId   : '',
    }))
    .filter((l: Line) => l.serviceId && l.staffId)
  const tipByStaff: Record<string, string | number> = body.tipByStaff ?? {}
  const paymentMethod = ['cash', 'transfer', 'pos'].includes(body.paymentMethod)
    ? (body.paymentMethod as string)
    : 'cash'

  if (lines.length === 0) {
    return NextResponse.json({ error: 'Please pick at least one service and assign staff.' }, { status: 400 })
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

  const uniqueServiceIds = Array.from(new Set(lines.map(l => l.serviceId)))
  const { data: services, error: svErr } = await supabase
    .from('services').select('id, name, price_ngn, material_cost_ngn').in('id', uniqueServiceIds) as { data: Pick<Service, 'id' | 'name' | 'price_ngn' | 'material_cost_ngn'>[] | null; error: unknown }
  if (svErr || !services?.length) return NextResponse.json({ error: 'Could not load service data.' }, { status: 500 })

  const serviceById  = new Map(services.map(s => [s.id, s]))
  const totalNgn     = lines.reduce((sum, l) => sum + (serviceById.get(l.serviceId)?.price_ngn ?? 0), 0)
  const totalTipNgn  = Array.from(tipsByStaff.values()).reduce((s, n) => s + n, 0)
  const visitDate    = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const primaryStaffId = lines[0].staffId

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

  const tipsPlaced = new Set<string>()
  const vsRows = lines.map(line => {
    const s   = serviceById.get(line.serviceId)!
    const tip = !tipsPlaced.has(line.staffId) && tipsByStaff.has(line.staffId)
      ? tipsByStaff.get(line.staffId)!
      : 0
    if (tip > 0) tipsPlaced.add(line.staffId)
    return {
      visit_id:       visit.id,
      service_id:     line.serviceId,
      staff_id:       line.staffId,
      price_ngn:      s.price_ngn,
      // Commission is 30% of the service portion only — never the
      // owner-only product (e.g. piercing earrings).
      commission_ngn: Math.round((s.price_ngn - (s.material_cost_ngn ?? 0)) * 0.3),
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
