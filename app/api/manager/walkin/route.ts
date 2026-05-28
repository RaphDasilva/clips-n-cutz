import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Service, Client, Visit } from '@/types/database'

interface Line { serviceId: string; staffId: string; priceNgn: number | null }

export async function POST(req: NextRequest) {
  const body = await req.json()
  const clientName: string  = (body.clientName  ?? '').trim()
  const clientPhone: string = (body.clientPhone ?? '').trim()
  const rawLines            = Array.isArray(body.lines) ? body.lines : []
  const lines: Line[]       = rawLines
    .map((l: { serviceId?: unknown; staffId?: unknown; priceNgn?: unknown }) => ({
      serviceId: typeof l.serviceId === 'string' ? l.serviceId : '',
      staffId:   typeof l.staffId   === 'string' ? l.staffId   : '',
      priceNgn:  typeof l.priceNgn === 'number' && Number.isFinite(l.priceNgn) && l.priceNgn >= 0
        ? Math.round(l.priceNgn) : null,
    }))
    .filter((l: Line) => l.serviceId && l.staffId)
  const tipByStaff:    Record<string, string | number> = body.tipByStaff ?? {}
  const paymentMethod: string = ['cash', 'transfer', 'pos'].includes(body.paymentMethod)
    ? body.paymentMethod
    : 'cash'

  if (!clientName || lines.length === 0) {
    return NextResponse.json(
      { error: 'Name and at least one service with a staff member are required.' },
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

  // 1. Fetch service prices (unique IDs only)
  const uniqueServiceIds = Array.from(new Set(lines.map(l => l.serviceId)))
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .in('id', uniqueServiceIds) as { data: Service[] | null; error: { message: string } | null }

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

  // 3. Totals — sum the prices for every line (duplicates count).
  //    A line may carry a manager-set price (e.g. extra dye for full
  //    hair); fall back to the service's base price otherwise.
  const serviceById = new Map(services.map(s => [s.id, s]))
  const priceFor = (l: Line) =>
    l.priceNgn ?? serviceById.get(l.serviceId)?.price_ngn ?? 0
  const totalNgn    = lines.reduce((sum, l) => sum + priceFor(l), 0)
  const totalTipNgn = Array.from(tipsByStaff.values()).reduce((s, n) => s + n, 0)

  // 4. Primary staff = staff on the first line (the "lead").
  const primaryStaffId = lines[0].staffId

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

  // 6. One visit_service row per LINE. Per-staff tips land on
  //    that staff's first line in the visit; subsequent lines
  //    for the same staff carry 0.
  const tipsPlaced = new Set<string>()
  const visitServices = lines.map(line => {
    const s   = serviceById.get(line.serviceId)!
    const tip = !tipsPlaced.has(line.staffId) && tipsByStaff.has(line.staffId)
      ? tipsByStaff.get(line.staffId)!
      : 0
    if (tip > 0) tipsPlaced.add(line.staffId)
    const price    = priceFor(line)
    const material = Math.min(s.material_cost_ngn ?? 0, price)
    return {
      visit_id:          visit.id,
      service_id:        line.serviceId,
      staff_id:          line.staffId,
      price_ngn:         price,
      material_cost_ngn: material,
      // Commission is 30% of the service portion only — never the
      // owner-only product (e.g. piercing earrings). The product
      // cost is deducted before the 30%; any extra the manager
      // added (e.g. full-hair dye) is part of the service.
      commission_ngn:    Math.round(Math.max(0, price - material) * 0.3),
      tip_ngn:           tip,
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
    serviceCount: lines.length,
  })
}
