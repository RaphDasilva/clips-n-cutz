import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/twilio'
import type { Service, Client } from '@/types/database'

interface Appointment { id: string; scheduled_at: string }

export async function POST(req: NextRequest) {
  const body        = await req.json()
  const clientName  = (body.clientName  ?? '').trim() as string
  const clientPhone = (body.clientPhone ?? '').trim() as string
  const serviceIds  = (body.serviceIds  ?? [])        as string[]
  const date        = (body.date        ?? '').trim() as string  // YYYY-MM-DD
  const timeValue   = (body.timeValue   ?? '').trim() as string  // HH:MM (24h)
  const timeLabel   = (body.timeLabel   ?? '').trim() as string  // "9:00 AM"

  if (!clientName || !clientPhone || !serviceIds.length || !date || !timeValue) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  const supabase = createClient()

  // 1. Load service details
  const { data: services, error: svErr } = await supabase
    .from('services')
    .select('*')
    .in('id', serviceIds) as { data: Service[] | null; error: unknown }

  if (svErr || !services?.length) {
    return NextResponse.json({ error: 'Could not load service data.' }, { status: 500 })
  }

  // 2. Upsert client by phone
  const { data: existingClient } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', clientPhone)
    .single() as { data: Client | null; error: unknown }

  let client: Client
  if (existingClient) {
    client = existingClient
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from('clients')
      .insert({ name: clientName, phone: clientPhone })
      .select()
      .single() as { data: Client | null; error: unknown }
    if (clientErr || !newClient) {
      return NextResponse.json({ error: 'Failed to create client record.' }, { status: 500 })
    }
    client = newClient
  }

  // 3. Create appointment (WAT = UTC+1)
  const scheduledAt = `${date}T${timeValue}:00+01:00`

  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .insert({ client_id: client.id, scheduled_at: scheduledAt, status: 'pending', source: 'online' })
    .select()
    .single() as { data: Appointment | null; error: unknown }

  if (apptErr || !appt) {
    return NextResponse.json({ error: 'Failed to create appointment.' }, { status: 500 })
  }

  // 4. Create appointment_services rows
  await supabase.from('appointment_services').insert(
    serviceIds.map(service_id => ({ appointment_id: appt.id, service_id }))
  )

  // 5. Format for messages
  const displayDate = new Date(`${date}T12:00:00+01:00`).toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos',
  })
  const serviceNames = services.map(s => s.name).join(', ')
  const firstName    = clientName.split(' ')[0]

  // 6. Send WhatsApp confirmation to client
  const clientMsg = [
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

  const twilioSid = await sendWhatsApp(clientPhone, clientMsg)

  await supabase.from('whatsapp_messages').insert({
    to_phone:               clientPhone,
    message_type:           'booking_confirmation',
    body:                   clientMsg,
    related_appointment_id: appt.id,
    twilio_sid:             twilioSid ?? undefined,
    status:                 twilioSid ? 'sent' : 'failed',
    sent_at:                new Date().toISOString(),
  })

  // 7. Notify manager
  const managerPhone = process.env.MANAGER_PHONE
  if (managerPhone) {
    const managerMsg = [
      `📅 *New Online Booking*`,
      ``,
      `Client: ${clientName}`,
      `Phone: ${clientPhone}`,
      `Service: ${serviceNames}`,
      `Date: ${displayDate}`,
      `Time: ${timeLabel}`,
    ].join('\n')
    await sendWhatsApp(managerPhone, managerMsg)
  }

  return NextResponse.json({ success: true, appointmentId: appt.id, displayDate, timeLabel, serviceNames })
}
