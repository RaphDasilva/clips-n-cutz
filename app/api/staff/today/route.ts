import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface VSRow {
  visit_id: string
  commission_ngn: number
  price_ngn: number
  created_at: string
  services: { name: string } | null
  visits: {
    visit_date: string
    tip_ngn: number
    clients: { name: string } | null
  } | null
}

interface ApptRow {
  id: string
  scheduled_at: string
  status: string
  clients: { name: string } | null
}

export async function GET(req: NextRequest) {
  const staffId = new URL(req.url).searchParams.get('staffId')
  if (!staffId) return NextResponse.json({ error: 'staffId required.' }, { status: 400 })

  const supabase = createClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })

  const [servicesRes, apptsRes, attRes, checkinRes] = await Promise.all([
    supabase
      .from('visit_services')
      .select('visit_id, commission_ngn, price_ngn, created_at, services(name), visits(visit_date, tip_ngn, clients(name))')
      .eq('staff_id', staffId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: VSRow[] | null; error: unknown }>,

    supabase
      .from('appointments')
      .select('id, scheduled_at, status, clients(name)')
      .eq('staff_id', staffId)
      .gte('scheduled_at', `${today}T00:00:00`)
      .lte('scheduled_at', `${today}T23:59:59`)
      .order('scheduled_at', { ascending: true }) as unknown as Promise<{ data: ApptRow[] | null; error: unknown }>,

    supabase
      .from('attendance')
      .select('status, penalty_ngn, checked_in_at')
      .eq('staff_id', staffId)
      .eq('date', today)
      .maybeSingle() as unknown as Promise<{ data: { status: string; penalty_ngn: number; checked_in_at: string | null } | null; error: unknown }>,

    supabase
      .from('checkin_requests')
      .select('status')
      .eq('staff_id', staffId)
      .eq('date', today)
      .maybeSingle() as unknown as Promise<{ data: { status: string } | null; error: unknown }>,
  ])

  const services     = servicesRes.data  ?? []
  const appointments = apptsRes.data     ?? []
  const attendance   = attRes.data       ?? null
  const checkin      = checkinRes.data   ?? null

  const todayCommission = services.reduce((s, r) => s + r.commission_ngn, 0)
  const todayServices   = services.length

  // Sum tips once per unique visit (a visit with 2 services would have 2 rows)
  const seenVisits = new Set<string>()
  const todayTips  = services.reduce((sum, r) => {
    if (!r.visit_id || seenVisits.has(r.visit_id)) return sum
    seenVisits.add(r.visit_id)
    return sum + (r.visits?.tip_ngn ?? 0)
  }, 0)

  return NextResponse.json({
    todayEarnings: todayCommission + todayTips,
    todayCommission,
    todayTips,
    todayServices,
    services,
    appointments,
    todayPenalty:     attendance?.penalty_ngn    ?? 0,
    todayAttStatus:   attendance?.status         ?? null,
    todayCheckedInAt: attendance?.checked_in_at  ?? null,
    checkinStatus:    checkin?.status            ?? null,
  })
}
