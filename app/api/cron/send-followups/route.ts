import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/twilio'

interface FollowUpRow {
  id: string
  clients: { name: string; phone: string } | null
  visits: {
    visit_services: {
      services: { name: string } | null
    }[]
  } | null
}

export async function GET(req: NextRequest) {
  // Simple secret check so only Vercel cron (or you) can trigger this
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = createClient()
  const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/book`

  const { data: followUps, error } = await supabase
    .from('follow_ups')
    .select(`
      id,
      clients!client_id ( name, phone ),
      visits!visit_id (
        visit_services (
          services!service_id ( name )
        )
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(50) as { data: FollowUpRow[] | null; error: unknown }

  if (error || !followUps) {
    return NextResponse.json({ error: 'Failed to load follow-ups.' }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const fu of followUps) {
    const clientName  = fu.clients?.name  ?? 'there'
    const clientPhone = fu.clients?.phone
    const firstName   = clientName.split(' ')[0]
    const serviceName = fu.visits?.visit_services?.[0]?.services?.name ?? 'your last service'

    if (!clientPhone) { failed++; continue }

    const msg = [
      `Hi ${firstName}! ✂️`,
      ``,
      `Hope you loved your ${serviceName}.`,
      `Ready for your next appointment? Book here 👇`,
      ``,
      bookingLink,
      ``,
      `_Clips N'Cutz Unisex Salon, Lagos_`,
    ].join('\n')

    const twilioSid = await sendWhatsApp(clientPhone, msg)
    const now = new Date().toISOString()

    await supabase
      .from('follow_ups')
      .update({ status: twilioSid ? 'sent' : 'failed', sent_at: now })
      .eq('id', fu.id)

    await supabase.from('whatsapp_messages').insert({
      to_phone:        clientPhone,
      message_type:    'followup_7day',
      body:            msg,
      twilio_sid:      twilioSid ?? undefined,
      status:          twilioSid ? 'sent' : 'failed',
      sent_at:         now,
    })

    twilioSid ? sent++ : failed++
  }

  return NextResponse.json({ processed: followUps.length, sent, failed })
}
