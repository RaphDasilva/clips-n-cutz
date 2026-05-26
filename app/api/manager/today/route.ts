import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AttendanceRow { status: 'on_time' | 'late' | 'absent'; users: { name: string } | null }
interface PendingRow    { staff_id: string; requested_at: string; users: { name: string; sunday_grace: boolean; off_days: number[] } | null }

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const date     = req.nextUrl.searchParams.get('date') ?? todayStr
  const isToday  = date === todayStr

  // Appointments only matter for today — scheduling visibility into
  // a past day is read-only and visits already cover what happened.
  const [visitsResult, appointmentsResult, attResult, pendingResult] = await Promise.all([
    supabase
      .from('visits')
      .select('id, total_ngn, tip_ngn, created_at, payment_method, clients(name), users(name), visit_services(services(name))')
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

    isToday
      ? supabase
          .from('checkin_requests')
          .select('staff_id, requested_at, users(name, sunday_grace, off_days)')
          .eq('date', date)
          .eq('status', 'pending')
          .order('requested_at', { ascending: true }) as unknown as Promise<{ data: PendingRow[] | null; error: unknown }>
      : Promise.resolve({ data: [] as PendingRow[], error: null }),
  ])

  const att = attResult.data ?? []
  const attendance = {
    onTime: att.filter(r => r.status === 'on_time').length,
    late:   att.filter(r => r.status === 'late').length,
    absent: att.filter(r => r.status === 'absent').length,
    lateStaff:   att.filter(r => r.status === 'late').map(r => r.users?.name ?? 'Unknown'),
    absentStaff: att.filter(r => r.status === 'absent').map(r => r.users?.name ?? 'Unknown'),
  }

  const pending = (pendingResult.data ?? []).map(r => ({
    staff_id:     r.staff_id,
    name:         r.users?.name         ?? 'Unknown',
    sunday_grace: r.users?.sunday_grace ?? false,
    off_days:     r.users?.off_days     ?? [],
    requested_at: r.requested_at,
  }))

  return NextResponse.json({
    date,
    isToday,
    visits:           visitsResult.data ?? [],
    appointments:     appointmentsResult.data ?? [],
    visitCount:       visitsResult.data?.length ?? 0,
    appointmentCount: appointmentsResult.data?.length ?? 0,
    attendance,
    pendingCheckins:  pending,
  })
}
