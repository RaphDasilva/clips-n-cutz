import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface VSRow {
  commission_ngn: number
  price_ngn: number
  created_at: string
  services: { name: string } | null
  visits: {
    visit_date: string
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

  const [servicesRes, apptsRes] = await Promise.all([
    supabase
      .from('visit_services')
      .select('commission_ngn, price_ngn, created_at, services(name), visits(visit_date, clients(name))')
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
  ])

  const services     = servicesRes.data ?? []
  const appointments = apptsRes.data    ?? []

  const todayEarnings  = services.reduce((s, r) => s + r.commission_ngn, 0)
  const todayServices  = services.length

  return NextResponse.json({
    todayEarnings,
    todayServices,
    services,
    appointments,
  })
}
