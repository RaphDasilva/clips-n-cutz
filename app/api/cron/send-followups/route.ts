import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging'

// Runs every day at 7am UTC (8am Lagos) via Vercel Cron.
// Handles two tasks in one pass:
//   1. 7-day follow-ups — WhatsApp message to clients 7 days after their visit
//   2. 24h reminders   — WhatsApp reminder for appointments scheduled tomorrow

interface FollowUpRow {
  id: string
  clients: { name: string; phone: string } | null
  visits: {
    visit_services: { services: { name: string } | null }[]
  } | null
}

interface ApptRow {
  id: string
  scheduled_at: string
  clients: { name: string; phone: string } | null
  appointment_services: { services: { name: string } | null }[]
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase    = createClient()
  const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/book`

  // ── Lagos date helpers ────────────────────────────────────────────────────
  const todayLagos    = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const tomorrowLagos = (() => {
    const d = new Date(todayLagos + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('en-CA')
  })()

  // ── Task 1: 7-day follow-ups ──────────────────────────────────────────────
  const { data: followUps } = await supabase
    .from('follow_ups')
    .select(`
      id,
      clients!client_id ( name, phone ),
      visits!visit_id (
        visit_services ( services!service_id ( name ) )
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(50) as { data: FollowUpRow[] | null }

  let followUpsSent   = 0
  let followUpsFailed = 0

  for (const fu of (followUps ?? [])) {
    const phone     = fu.clients?.phone
    const name      = fu.clients?.name ?? 'there'
    const firstName = name.split(' ')[0]
    const svcName   = fu.visits?.visit_services?.[0]?.services?.name ?? 'your last service'

    if (!phone) { followUpsFailed++; continue }

    const msg = [
      `Hi ${firstName}! ✂️`,
      ``,
      `Hope you loved your ${svcName}.`,
      `Ready for your next appointment? Book here 👇`,
      ``,
      bookingLink,
      ``,
      `_Clips N'Cutz Unisex Salon, Lagos_`,
    ].join('\n')

    const sid = await sendMessage(phone, msg)
    const now = new Date().toISOString()

    await supabase
      .from('follow_ups')
      .update({ status: sid ? 'sent' : 'failed', sent_at: now })
      .eq('id', fu.id)

    await supabase.from('whatsapp_messages').insert({
      to_phone:     phone,
      message_type: 'followup_7day',
      body:         msg,
      twilio_sid:   sid ?? undefined,
      status:       sid ? 'sent' : 'failed',
      sent_at:      now,
    })

    sid ? followUpsSent++ : followUpsFailed++
  }

  // ── Task 2: 24h reminders for tomorrow's appointments ────────────────────
  const { data: appts } = await supabase
    .from('appointments')
    .select(`
      id, scheduled_at,
      clients!client_id ( name, phone ),
      appointment_services ( services!service_id ( name ) )
    `)
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', `${tomorrowLagos}T00:00:00+01:00`)
    .lte('scheduled_at', `${tomorrowLagos}T23:59:59+01:00`) as unknown as {
      data: ApptRow[] | null
    }

  // Which 24h reminders already sent?
  const tomorrowApptIds = (appts ?? []).map(a => a.id)
  const { data: alreadySent } = tomorrowApptIds.length
    ? await supabase
        .from('whatsapp_messages')
        .select('related_appointment_id')
        .in('related_appointment_id', tomorrowApptIds)
        .eq('message_type', 'reminder_24h')
        .eq('status', 'sent') as unknown as { data: { related_appointment_id: string }[] | null }
    : { data: [] }

  const alreadySentIds = new Set((alreadySent ?? []).map(r => r.related_appointment_id))

  let remindersSent   = 0
  let remindersFailed = 0

  for (const appt of (appts ?? [])) {
    if (alreadySentIds.has(appt.id)) continue

    const phone     = appt.clients?.phone
    const name      = appt.clients?.name ?? 'there'
    const firstName = name.split(' ')[0]
    if (!phone) { remindersFailed++; continue }

    const timeStr  = new Date(appt.scheduled_at).toLocaleTimeString('en-NG', {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos',
    })
    const dateStr  = new Date(appt.scheduled_at).toLocaleDateString('en-NG', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos',
    })
    const svcNames = appt.appointment_services
      .map(s => s.services?.name)
      .filter(Boolean)
      .join(', ') || 'your appointment'

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

    const sid = await sendMessage(phone, msg)
    const now = new Date().toISOString()

    await supabase.from('whatsapp_messages').insert({
      to_phone:               phone,
      message_type:           'reminder_24h',
      body:                   msg,
      related_appointment_id: appt.id,
      twilio_sid:             sid ?? undefined,
      status:                 sid ? 'sent' : 'failed',
      sent_at:                now,
    })

    sid ? remindersSent++ : remindersFailed++
  }

  // ── Task 3: 30-day client re-engagement ──────────────────────────────────
  // Find clients with a phone whose last visit was exactly 30+ days
  // ago and who haven't yet received a re-engagement message for
  // this dormancy stretch (i.e. no client_reengagements row newer
  // than their last visit).
  const REENGAGE_DAYS = 30
  const threshold = new Date(todayLagos + 'T12:00:00')
  threshold.setDate(threshold.getDate() - REENGAGE_DAYS)
  const thresholdStr = threshold.toLocaleDateString('en-CA')

  const { data: candidates } = await supabase
    .from('clients')
    .select('id, name, phone, visits(visit_date)')
    .not('phone', 'is', null)
    .limit(500) as unknown as {
      data: { id: string; name: string; phone: string; visits: { visit_date: string }[] }[] | null
    }

  let reengageSent = 0, reengageFailed = 0

  for (const c of (candidates ?? [])) {
    if (!c.phone || !c.visits || c.visits.length === 0) continue
    const lastDate = c.visits.map(v => v.visit_date).sort().slice(-1)[0]
    if (!lastDate || lastDate > thresholdStr) continue

    // Has a re-engagement been sent AFTER this last visit?
    const { data: prior } = await supabase
      .from('client_reengagements')
      .select('id, sent_at')
      .eq('client_id', c.id)
      .gte('sent_at', lastDate + 'T00:00:00')
      .limit(1)
      .maybeSingle() as { data: { id: string } | null }
    if (prior) continue

    const firstName = c.name.split(' ')[0]
    const msg = [
      `Hi ${firstName}! ✂️`,
      ``,
      `It's been a while since your last visit to *Clips N'Cutz*. We'd love to see you back.`,
      ``,
      `Book your next appointment here 👇`,
      bookingLink,
      ``,
      `_Clips N'Cutz Unisex Salon, Lagos_`,
    ].join('\n')

    const sid = await sendMessage(c.phone, msg)

    await supabase.from('client_reengagements').insert({
      client_id:     c.id,
      last_visit_at: lastDate,
      status:        sid ? 'sent' : 'failed',
      twilio_sid:    sid ?? undefined,
    })

    await supabase.from('whatsapp_messages').insert({
      to_phone:     c.phone,
      message_type: 'followup_7day',     // closest existing enum value; re-uses the slot
      body:         msg,
      twilio_sid:   sid ?? undefined,
      status:       sid ? 'sent' : 'failed',
      sent_at:      new Date().toISOString(),
    })

    sid ? reengageSent++ : reengageFailed++
  }

  return NextResponse.json({
    followUps:    { sent: followUpsSent,  failed: followUpsFailed  },
    reminders:    { sent: remindersSent,  failed: remindersFailed  },
    reengagement: { sent: reengageSent,   failed: reengageFailed   },
  })
}
