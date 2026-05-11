import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Service, Client, Visit } from '@/types/database'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const clientName: string  = (body.clientName  ?? '').trim()
  const clientPhone: string = (body.clientPhone ?? '').trim()
  const staffId: string     = (body.staffId     ?? '').trim()
  const serviceIds: string[] = body.serviceIds ?? []
  const tipNgn: number      = Math.max(0, parseInt(body.tipNgn ?? '0', 10) || 0)

  if (!clientName || !clientPhone || !staffId || serviceIds.length === 0) {
    return NextResponse.json(
      { error: 'Name, phone, staff, and at least one service are required.' },
      { status: 400 }
    )
  }

  const supabase = createClient()

  // 1. Fetch service prices (need them for price snapshot + commission)
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .in('id', serviceIds) as { data: Service[] | null; error: { message: string } | null }

  if (servicesError || !services || services.length === 0) {
    return NextResponse.json({ error: 'Could not load service data.' }, { status: 500 })
  }

  // 2. Upsert client — if phone exists, return existing; otherwise create new
  const { data: existingClient } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', clientPhone)
    .single() as { data: Client | null; error: unknown }

  let client: Client

  if (existingClient) {
    client = existingClient
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({ name: clientName, phone: clientPhone })
      .select()
      .single() as { data: Client | null; error: { message: string } | null }

    if (clientError || !newClient) {
      return NextResponse.json({ error: 'Failed to create client record.' }, { status: 500 })
    }
    client = newClient
  }

  // 3. Calculate totals
  const totalNgn = services.reduce((sum, s) => sum + s.price_ngn, 0)

  // 4. Create the visit
  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .insert({
      client_id: client.id,
      staff_id: staffId,
      visit_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }),
      total_ngn: totalNgn,
      tip_ngn: tipNgn,
    })
    .select()
    .single() as { data: Visit | null; error: { message: string } | null }

  if (visitError || !visit) {
    return NextResponse.json({ error: 'Failed to create visit record.' }, { status: 500 })
  }

  // 5. Create one visit_service row per service
  const visitServices = services.map((s) => ({
    visit_id: visit.id,
    service_id: s.id,
    staff_id: staffId,
    price_ngn: s.price_ngn,
    commission_ngn: Math.round(s.price_ngn * 0.3), // exactly 30%
  }))

  const { error: vsError } = await supabase.from('visit_services').insert(visitServices)

  if (vsError) {
    return NextResponse.json({ error: 'Failed to save services for visit.' }, { status: 500 })
  }

  // 6. Schedule a follow-up WhatsApp message 7 days from now
  const followUpDate = new Date()
  followUpDate.setDate(followUpDate.getDate() + 7)

  await supabase.from('follow_ups').insert({
    client_id: client.id,
    visit_id: visit.id,
    scheduled_for: followUpDate.toISOString(),
  })

  return NextResponse.json({
    success: true,
    visitId: visit.id,
    clientName: client.name,
    totalNgn,
    serviceCount: services.length,
  })
}
