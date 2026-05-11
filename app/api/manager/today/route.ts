import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) // YYYY-MM-DD in Lagos time

  const [visitsResult, appointmentsResult] = await Promise.all([
    supabase
      .from('visits')
      .select('id, total_ngn, created_at, clients(name)')
      .eq('visit_date', todayStr)
      .order('created_at', { ascending: false }),

    supabase
      .from('appointments')
      .select('id, scheduled_at, status, clients(name)')
      .gte('scheduled_at', `${todayStr}T00:00:00+01:00`)
      .lte('scheduled_at', `${todayStr}T23:59:59+01:00`)
      .order('scheduled_at', { ascending: true }),
  ])

  return NextResponse.json({
    visits: visitsResult.data ?? [],
    appointments: appointmentsResult.data ?? [],
    visitCount: visitsResult.data?.length ?? 0,
    appointmentCount: appointmentsResult.data?.length ?? 0,
  })
}
