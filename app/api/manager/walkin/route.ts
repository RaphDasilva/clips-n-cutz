import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Service, Client, Visit } from '@/types/database'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const clientName: string   = (body.clientName  ?? '').trim()
  const clientPhone: string  = (body.clientPhone ?? '').trim()
  const serviceIds: string[] = Array.isArray(body.serviceIds) ? body.serviceIds : []
  const staffByService: Record<string, string> = body.staffByService ?? {}
  const tipByStaff:     Record<string, string | number> = body.tipByStaff ?? {}
  const paymentMethod: string = ['cash', 'transfer', 'pos'].includes(body.paymentMethod)
    ? body.paymentMethod
    : 'cash'

  if (!clientName || serviceIds.length === 0) {
    return NextResponse.json(
      { error: 'Name and at least one service are required.' },
      { status: 400 }
    )
  }

  // Every selected service must be assigned to a staff
  const unassigned = serviceIds.find(sid => !staffByService[sid])
  if (unassigned) {
    return NextResponse.json(
      { error: 'Every service must be assigned to a staff member.' },
      { status: 400 }
    )
  }

  // Normalise tips: per-staff, integer, never negative
  const tipsByStaff = new Map<string, number>()
  for (const [staffId, raw] of Object.entries(tipByStaff)) {
    const n = Math.max(0, parseInt(String(raw), 10) || 0)
    if (n > 0) tipsByStaff.set(staffId, n)
  }

  const supabase = createClient()

  // 1. Fetch service prices
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .in('id', serviceIds) as { data: Service[] | null; error: { message: string } | null }

  if (servicesError || !services || services.length === 0) {
    return NextResponse.json({ error: 'Could not load service data.' }, { status: 500 })
  }

  // 2. Upsert client by phone when provided; otherwise create
  //    a new anonymous client row.
  let client: Client

  if (clientPhone) {
    const { data: existingClient } = await supabase
      .from('clients').select('*').eq('phone', clientPhone).single() as { data: Client | null; error: unknown }

    if (existingClient) {
      client = existingClient
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from('clients').insert({ name: clientName, phone: clientPhone }).select().single() as { data: Client | null; error: { message: string } | null }

      if (clientError || !newClient) {
        return NextResponse.json({ error: 'Failed to create client record.' }, { status: 500 })
      }
      client = newClient
    }
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients').insert({ name: clientName, phone: null }).select().single() as { data: Client | null; error: { message: string } | null }

    if (clientError || !newClient) {
      return NextResponse.json({ error: 'Failed to create client record.' }, { status: 500 })
    }
    client = newClient
  }

  // 3. Totals
  const totalNgn   = services.reduce((sum, s) => sum + s.price_ngn, 0)
  const totalTipNgn = Array.from(tipsByStaff.values()).reduce((s, n) => s + n, 0)

  // 4. Primary staff for the visit row = staff assigned to the
  //    first selected service. The visits.staff_id column is
  //    referenced by appointments and exposed in some reports
  //    as the "lead" — picking the first service's staff is
  //    consistent with the picker's natural order.
  const primaryStaffId = staffByService[serviceIds[0]]

  // 5. Create the visit
  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .insert({
      client_id:      client.id,
      staff_id:       primaryStaffId,
      visit_date:     new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }),
      total_ngn:      totalNgn,
      tip_ngn:        totalTipNgn,
      payment_method: paymentMethod,
    })
    .select()
    .single() as { data: Visit | null; error: { message: string } | null }

  if (visitError || !visit) {
    return NextResponse.json({ error: 'Failed to create visit record.' }, { status: 500 })
  }

  // 6. One visit_service row per service. Tip per staff is
  //    placed entirely on that staff's first service line for
  //    this visit; subsequent lines for the same staff carry 0.
  const tipsPlaced = new Set<string>()
  const serviceById = new Map(services.map(s => [s.id, s]))
  const visitServices = serviceIds.map(sid => {
    const s        = serviceById.get(sid)!
    const staffId  = staffByService[sid]
    const tip      = !tipsPlaced.has(staffId) && tipsByStaff.has(staffId)
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

  const { error: vsError } = await supabase.from('visit_services').insert(visitServices)

  if (vsError) {
    return NextResponse.json({ error: 'Failed to save services for visit.' }, { status: 500 })
  }

  // 7. Follow-up only when we have a phone to message
  if (clientPhone) {
    const followUpDate = new Date()
    followUpDate.setDate(followUpDate.getDate() + 7)

    await supabase.from('follow_ups').insert({
      client_id:     client.id,
      visit_id:      visit.id,
      scheduled_for: followUpDate.toISOString(),
    })
  }

  return NextResponse.json({
    success:      true,
    visitId:      visit.id,
    clientName:   client.name,
    totalNgn,
    tipNgn:       totalTipNgn,
    serviceCount: services.length,
  })
}
