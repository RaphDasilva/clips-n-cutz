import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging'
import { isLocalRequest, isDemoStaffName } from '@/lib/env'
import type { Service, Client } from '@/types/database'

interface NewAppt { id: string; scheduled_at: string }

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const filter = req.nextUrl.searchParams.get('filter') ?? 'today'

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })

  let query = supabase
    .from('appointments')
    .select('id, scheduled_at, status, source, notes, clients(id, name, phone), appointment_services(service_id, services(name, price_ngn)), users(name)')
    .order('scheduled_at', { ascending: true })

  if (filter === 'today') {
    query = query
      .gte('scheduled_at', `${todayStr}T00:00:00+01:00`)
      .lte('scheduled_at', `${todayStr}T23:59:59+01:00`)
  } else if (filter === 'upcoming') {
    query = query.gte('scheduled_at', `${todayStr}T00:00:00+01:00`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const showDemo = await isLocalRequest()
  const rows = (data ?? []) as unknown as Array<{ users: { name: string } | null }>
  const filtered = rows.filter(a => showDemo || !isDemoStaffName(a.users?.name))
  return NextResponse.json(filtered)
}

export async function POST(req: NextRequest) {
  const body        = await req.json()
  const clientName  = (body.clientName  ?? '').trim() as string
  const clientPhone = (body.clientPhone ?? '').trim() as string
  const serviceIds  = (body.serviceIds  ?? [])        as string[]
  const date        = (body.date        ?? '').trim() as string
  const timeValue   = (body.timeValue   ?? '').trim() as string
  const timeLabel   = (body.timeLabel   ?? '').trim() as string

  if (!clientName || !clientPhone || !serviceIds.length || !date || !timeValue) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  const supabase = createClient()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .in('id', serviceIds) as { data: Service[] | null; error: unknown }

  if (!services?.length) {
    return NextResponse.json({ error: 'Could not load service data.' }, { status: 500 })
  }

  const { data: existing } = await supabase
    .from('clients').select('*').eq('phone', clientPhone).single() as { data: Client | null; error: unknown }

  let client: Client
  if (existing) {
    client = existing
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from('clients').insert({ name: clientName, phone: clientPhone }).select().single() as { data: Client | null; error: unknown }
    if (clientErr || !newClient) return NextResponse.json({ error: 'Failed to create client.' }, { status: 500 })
    client = newClient
  }

  const scheduledAt = `${date}T${timeValue}:00+01:00`
  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .insert({ client_id: client.id, scheduled_at: scheduledAt, status: 'confirmed', source: 'phone' })
    .select().single() as { data: NewAppt | null; error: unknown }

  if (apptErr || !appt) return NextResponse.json({ error: 'Failed to create appointment.' }, { status: 500 })

  await supabase.from('appointment_services').insert(
    serviceIds.map(service_id => ({ appointment_id: appt.id, service_id }))
  )

  const displayDate = new Date(`${date}T12:00:00+01:00`).toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos',
  })
  const serviceNames = services.map((s: Service) => s.name).join(', ')
  const firstName    = clientName.split(' ')[0]

  const msg = [
    `Hi ${firstName}! ✂️`,
    ``,
    `Your appointment at *Clips N'Cutz* is confirmed.`,
    ``,
    `📅 ${displayDate}`,
    `⏰ ${timeLabel}`,
    `✂️ ${serviceNames}`,
    ``,
    `We'll see you then! Reply if you need to reschedule.`,
    ``,
    `_Clips N'Cutz Unisex Salon, Lagos_`,
  ].join('\n')

  const sid = await sendMessage(clientPhone, msg)
  await supabase.from('whatsapp_messages').insert({
    to_phone: clientPhone,
    message_type: 'booking_confirmation',
    body: msg,
    related_appointment_id: appt.id,
    twilio_sid: sid ?? undefined,
    status: sid ? 'sent' : 'failed',
    sent_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true, appointmentId: appt.id })
}
