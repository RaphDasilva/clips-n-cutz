import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/twilio'

// Runs every hour via Vercel Cron (Pro plan).
// Each run handles two reminder types:
//   24h — appointments scheduled 23–25 hours from now
//   2h  — appointments scheduled 1h45m–2h15m from now
// Deduplication: checks whatsapp_messages before sending to avoid double-sends.

interface ApptRow {
  id: string
  scheduled_at: string
  clients: { name: string; phone: string } | null
  appointment_services: { services: { name: string } | null }[]
}

function lagosNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }))
}

function fmtApptTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos',
  })
}

function fmtApptDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos',
  })
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const now      = new Date()

  // ── Fetch upcoming confirmed/pending appointments (within next 26h) ──────
  const windowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000)

  const { data: appts } = await supabase
    .from('appointments')
    .select(`
      id, scheduled_at,
      clients!client_id ( name, phone ),
      appointment_services ( services!service_id ( name ) )
    `)
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', windowEnd.toISOString()) as unknown as {
      data: ApptRow[] | null
    }

  if (!appts?.length) {
    return NextResponse.json({ sent24h: 0, sent2h: 0 })
  }

  // ── Check which reminders have already been sent ──────────────────────────
  const apptIds = appts.map(a => a.id)
  const { data: alreadySent } = await supabase
    .from('whatsapp_messages')
    .select('related_appointment_id, message_type')
    .in('related_appointment_id', apptIds)
    .in('message_type', ['reminder_24h', 'reminder_2h'])
    .eq('status', 'sent') as unknown as {
      data: { related_appointment_id: string; message_type: string }[] | null
    }

  const sentSet = new Set(
    (alreadySent ?? []).map(r => `${r.related_appointment_id}:${r.message_type}`)
  )

  // ── Send reminders ────────────────────────────────────────────────────────
  let sent24h = 0
  let sent2h  = 0

  for (const appt of appts) {
    const phone     = appt.clients?.phone
    const name      = appt.clients?.name ?? 'there'
    const firstName = name.split(' ')[0]
    if (!phone) continue

    const apptTime   = new Date(appt.scheduled_at)
    const minsUntil  = (apptTime.getTime() - now.getTime()) / 60_000
    const timeStr    = fmtApptTime(appt.scheduled_at)
    const dateStr    = fmtApptDate(appt.scheduled_at)
    const svcNames   = appt.appointment_services
      .map(s => s.services?.name)
      .filter(Boolean)
      .join(', ') || 'your appointment'

    // 24h reminder — window: 23h to 25h out
    if (minsUntil >= 23 * 60 && minsUntil <= 25 * 60) {
      const key = `${appt.id}:reminder_24h`
      if (!sentSet.has(key)) {
        const msg = [
          `Hi ${firstName}! 👋`,
          ``,
          `Just a reminder — your appointment at *Clips N'Cutz* is tomorrow.`,
          ``,
          `📅 ${dateStr}`,
          `⏰ ${timeStr}`,
          `✂️ ${svcNames}`,
          ``,
          `See you then! Reply if you need to reschedule.`,
          ``,
          `_Clips N'Cutz Unisex Salon, Lagos_`,
        ].join('\n')

        const sid = await sendWhatsApp(phone, msg)
        await supabase.from('whatsapp_messages').insert({
          to_phone:               phone,
          message_type:           'reminder_24h',
          body:                   msg,
          related_appointment_id: appt.id,
          twilio_sid:             sid ?? undefined,
          status:                 sid ? 'sent' : 'failed',
          sent_at:                new Date().toISOString(),
        })
        if (sid) sent24h++
      }
    }

    // 2h reminder — window: 1h45m to 2h15m out
    if (minsUntil >= 105 && minsUntil <= 135) {
      const key = `${appt.id}:reminder_2h`
      if (!sentSet.has(key)) {
        const msg = [
          `Hi ${firstName}! ⏰`,
          ``,
          `Your appointment at *Clips N'Cutz* is in about 2 hours.`,
          ``,
          `⏰ ${timeStr} today`,
          `✂️ ${svcNames}`,
          ``,
          `We'll see you soon!`,
          ``,
          `_Clips N'Cutz Unisex Salon, Lagos_`,
        ].join('\n')

        const sid = await sendWhatsApp(phone, msg)
        await supabase.from('whatsapp_messages').insert({
          to_phone:               phone,
          message_type:           'reminder_2h',
          body:                   msg,
          related_appointment_id: appt.id,
          twilio_sid:             sid ?? undefined,
          status:                 sid ? 'sent' : 'failed',
          sent_at:                new Date().toISOString(),
        })
        if (sid) sent2h++
      }
    }
  }

  return NextResponse.json({ sent24h, sent2h, checked: appts.length })
}
