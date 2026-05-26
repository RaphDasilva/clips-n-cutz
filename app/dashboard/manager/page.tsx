'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface TodayVisit {
  id: string
  total_ngn: number
  created_at: string
  clients: { name: string } | null
  users: { name: string } | null
}

interface TodayAppointment {
  id: string
  scheduled_at: string
  status: string
  clients: { name: string } | null
}

interface AttendanceSummary {
  onTime: number
  late: number
  absent: number
  lateStaff: string[]
  absentStaff: string[]
}

interface TodayData {
  date: string
  isToday: boolean
  visitCount: number
  appointmentCount: number
  visits: TodayVisit[]
  appointments: TodayAppointment[]
  attendance: AttendanceSummary
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-[var(--border)] text-[var(--text-muted)] border-[var(--border-strong)]',
  pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  no_show:   'bg-red-500/10 text-red-400 border-red-500/20',
}

function fmt12h(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos',
  })
}

function fmtNaira(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
      <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-3">{label}</p>
      <p className="text-[var(--text)] text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-[var(--text-dim)] text-xs mt-1.5">{sub}</p>}
    </div>
  )
}

interface TipsRow { staffId: string; staffName: string; tips: number }
interface TipsResp { breakdown: TipsRow[]; totalTips: number }

function lagosToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function fmtDateHeader(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default function ManagerHome() {
  const router = useRouter()
  const [userName, setUserName]     = useState('')
  const [selectedDate, setSelectedDate] = useState<string>(lagosToday)
  const [data, setData]             = useState<TodayData | null>(null)
  const [tipsData, setTipsData]     = useState<TipsResp | null>(null)
  const [loading, setLoading]       = useState(true)

  // Delete-visit confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; amount: number } | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [deleteError, setDeleteError]   = useState('')

  const load = useCallback(async (dateStr: string) => {
    const session = getSession()
    if (!session) { router.replace('/login'); return }
    setUserName(session.name.split(' ')[0])
    setLoading(true)
    const [todayRes, tipsRes] = await Promise.all([
      fetch(`/api/manager/today?date=${dateStr}`),
      fetch(`/api/manager/tips?from=${dateStr}&to=${dateStr}`),
    ])
    if (todayRes.ok) setData(await todayRes.json())
    if (tipsRes.ok) setTipsData(await tipsRes.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load(selectedDate) }, [load, selectedDate])

  const todayStr  = lagosToday()
  const isToday   = selectedDate === todayStr
  const isFuture  = selectedDate > todayStr
  const totalRevenue = data?.visits.reduce((s, v) => s + v.total_ngn, 0) ?? 0

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError('')
    try {
      const res = await fetch(`/api/manager/visits/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setDeleteError(j.error ?? 'Failed to remove visit.')
        return
      }
      setDeleteTarget(null)
      load(selectedDate)
    } catch {
      setDeleteError('Connection error.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-[var(--text-dim)] text-sm mb-1">{fmtDateHeader(selectedDate)}</p>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">
            {isToday ? <>Good {getGreeting()}{userName ? `, ${userName}` : ''}</> : 'Day Recap'}
          </h1>
        </div>
        {isToday && (
          <Link
            href="/dashboard/manager/walk-in"
            className="inline-flex items-center gap-2 bg-[var(--text)] text-[var(--bg)] font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all w-fit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Walk-in
          </Link>
        )}
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-2 mb-8 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1 w-fit">
        <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elevated)] rounded-md text-xs font-medium transition-all flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Prev
        </button>
        <button onClick={() => setSelectedDate(todayStr)}
          disabled={isToday}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            isToday
              ? 'bg-[var(--text)] text-[var(--bg)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elevated)]'
          }`}>
          Today
        </button>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          disabled={isFuture}
          className="px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elevated)] rounded-md text-xs font-medium transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed">
          Next
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[0,1,2].map(i => (
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard label="Walk-ins" value={data?.visitCount ?? 0} />
          {isToday ? (
            <StatCard label="Appointments" value={data?.appointmentCount ?? 0} />
          ) : (
            <StatCard label="Attendance" value={`${data?.attendance.onTime ?? 0}/${(data?.attendance.onTime ?? 0) + (data?.attendance.late ?? 0) + (data?.attendance.absent ?? 0)}`} sub="on time" />
          )}
          <StatCard
            label="Revenue"
            value={fmtNaira(totalRevenue)}
            sub={isToday ? 'from walk-ins' : 'walk-ins on this day'}
          />
        </div>
      )}

      {/* Attendance summary — visible on past days; today has its own dedicated page */}
      {!isToday && !loading && data && (data.attendance.late > 0 || data.attendance.absent > 0) && (
        <section className="mb-8">
          <h2 className="text-[var(--text)] text-sm font-semibold mb-3">Attendance</h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-emerald-400 text-base font-bold tabular-nums">{data.attendance.onTime}</p>
              <p className="text-[var(--text-dim)]">On time</p>
            </div>
            <div>
              <p className="text-amber-400 text-base font-bold tabular-nums">{data.attendance.late}</p>
              <p className="text-[var(--text-dim)] truncate">Late{data.attendance.lateStaff.length ? `: ${data.attendance.lateStaff.join(', ')}` : ''}</p>
            </div>
            <div>
              <p className="text-red-400 text-base font-bold tabular-nums">{data.attendance.absent}</p>
              <p className="text-[var(--text-dim)] truncate">Absent{data.attendance.absentStaff.length ? `: ${data.attendance.absentStaff.join(', ')}` : ''}</p>
            </div>
          </div>
        </section>
      )}

      {/* Two-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Appointments — today only */}
        {isToday && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[var(--text)] text-sm font-semibold">Today&apos;s Appointments</h2>
              <span className="text-[var(--text-dim)] text-xs">{data?.appointmentCount ?? 0} total</span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[0,1,2].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-14 animate-pulse" />)}
              </div>
            ) : data?.appointments.length === 0 ? (
              <Empty text="No appointments scheduled for today." />
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
                {data!.appointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-[var(--text)] text-sm font-medium">{a.clients?.name ?? '—'}</p>
                      <p className="text-[var(--text-dim)] text-xs mt-0.5">{fmt12h(a.scheduled_at)}</p>
                    </div>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[a.status] ?? STATUS_STYLES.pending}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Walk-ins (today: latest 6 with delete; past: full list, read-only) */}
        <section className={isToday ? '' : 'lg:col-span-2'}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--text)] text-sm font-semibold">{isToday ? 'Recent Walk-ins' : 'Walk-ins on this day'}</h2>
            <span className="text-[var(--text-dim)] text-xs">{data?.visitCount ?? 0} total</span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[0,1,2].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-14 animate-pulse" />)}
            </div>
          ) : data?.visits.length === 0 ? (
            <Empty text={isToday ? 'No walk-ins logged today yet.' : 'No walk-ins recorded on this day.'} />
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
              {(isToday ? data!.visits.slice(0, 6) : data!.visits).map((v) => (
                <div key={v.id} className="flex items-center justify-between px-4 py-3.5 group">
                  <div className="min-w-0 flex-1">
                    <p className="text-[var(--text)] text-sm font-medium truncate">{v.clients?.name ?? '—'}</p>
                    <p className="text-[var(--text-dim)] text-xs mt-0.5">
                      {v.users?.name ?? '—'} · {fmt12h(v.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <p className="text-[var(--text)] text-sm font-semibold tabular-nums">{fmtNaira(v.total_ngn)}</p>
                    {isToday && (
                    <button onClick={() => setDeleteTarget({ id: v.id, name: v.clients?.name ?? 'this visit', amount: v.total_ngn })}
                      title="Delete this visit (mistake)"
                      className="opacity-60 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-dim)] hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Tips today */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[var(--text)] text-sm font-semibold">{isToday ? 'Tips Today' : 'Tips on this day'}</h2>
          <span className="text-emerald-400 text-xs font-semibold tabular-nums">
            {tipsData ? fmtNaira(tipsData.totalTips) : ''}
          </span>
        </div>
        {loading ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-16 animate-pulse" />
        ) : !tipsData || tipsData.breakdown.length === 0 ? (
          <Empty text={isToday ? 'No tips recorded yet today.' : 'No tips recorded on this day.'} />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
            {tipsData.breakdown.map(t => (
              <div key={t.staffId} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--border)] border border-[var(--border-strong)] flex items-center justify-center">
                    <span className="text-[var(--text)] text-xs font-semibold">{t.staffName.charAt(0).toUpperCase()}</span>
                  </div>
                  <p className="text-[var(--text)] text-sm font-medium">{t.staffName}</p>
                </div>
                <p className="text-emerald-400 text-sm font-semibold tabular-nums">{fmtNaira(t.tips)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delete-visit confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.732 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[var(--text)] font-semibold">Remove visit?</h2>
                <p className="text-[var(--text-dim)] text-xs mt-1">
                  {deleteTarget.name} &middot; ₦{deleteTarget.amount.toLocaleString('en-NG')}
                </p>
              </div>
            </div>
            <p className="text-[var(--text-muted)] text-sm mb-5">
              This permanently deletes the visit. Commission and tips will be removed from staff totals. Use this only to clean up mistakes.
            </p>
            {deleteError && <p className="text-red-400 text-xs mb-3">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 bg-[var(--elevated)] border border-[var(--border-strong)] text-[var(--text)] font-medium py-2.5 rounded-xl text-sm hover:bg-[var(--card)] transition-all">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-2.5 rounded-xl text-sm hover:bg-red-500/20 disabled:opacity-40 transition-all">
                {deleting ? 'Removing…' : 'Remove visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-8 text-center">
      <p className="text-[var(--text-faint)] text-sm">{text}</p>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
