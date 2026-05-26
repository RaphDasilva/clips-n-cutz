import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AttendanceRow { status: 'on_time' | 'late' | 'absent'; users: { name: string } | null }

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const date     = req.nextUrl.searchParams.get('date') ?? todayStr
  const isToday  = date === todayStr

  // Appointments only matter for today — scheduling visibility into
  // a past day is read-only and visits already cover what happened.
  const [visitsResult, appointmentsResult, attResult] = await Promise.all([
    supabase
      .from('visits')
      .select('id, total_ngn, tip_ngn, created_at, payment_method, clients(name), users(name)')
      .eq('visit_date', date)
      .order('created_at', { ascending: false }),

    isToday
      ? supabase
          .from('appointments')
          .select('id, scheduled_at, status, clients(name)')
          .gte('scheduled_at', `${date}T00:00:00+01:00`)
          .lte('scheduled_at', `${date}T23:59:59+01:00`)
          .order('scheduled_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),

    supabase
      .from('attendance')
      .select('status, users!staff_id(name)')
      .eq('date', date) as unknown as Promise<{ data: AttendanceRow[] | null; error: unknown }>,
  ])

  const att = attResult.data ?? []
  const attendance = {
    onTime: att.filter(r => r.status === 'on_time').length,
    late:   att.filter(r => r.status === 'late').length,
    absent: att.filter(r => r.status === 'absent').length,
    lateStaff:   att.filter(r => r.status === 'late').map(r => r.users?.name ?? 'Unknown'),
    absentStaff: att.filter(r => r.status === 'absent').map(r => r.users?.name ?? 'Unknown'),
  }

  return NextResponse.json({
    date,
    isToday,
    visits:           visitsResult.data ?? [],
    appointments:     appointmentsResult.data ?? [],
    visitCount:       visitsResult.data?.length ?? 0,
    appointmentCount: appointmentsResult.data?.length ?? 0,
    attendance,
  })
}
