import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const [visitsResult, appointmentsResult] = await Promise.all([
    supabase
      .from('visits')
      .select('id, total_ngn, created_at, clients(name)')
      .eq('visit_date', today)
      .order('created_at', { ascending: false }),

    supabase
      .from('appointments')
      .select('id, scheduled_at, status, clients(name)')
      .gte('scheduled_at', `${today}T00:00:00`)
      .lte('scheduled_at', `${today}T23:59:59`)
      .order('scheduled_at', { ascending: true }),
  ])

  return NextResponse.json({
    visits: visitsResult.data ?? [],
    appointments: appointmentsResult.data ?? [],
    visitCount: visitsResult.data?.length ?? 0,
    appointmentCount: appointmentsResult.data?.length ?? 0,
  })
}
