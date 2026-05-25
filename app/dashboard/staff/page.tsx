'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ServiceEntry {
  commission_ngn: number
  price_ngn: number
  created_at: string
  services: { name: string } | null
  visits: { visit_date: string; clients: { name: string } | null } | null
}

interface Appointment {
  id: string
  scheduled_at: string
  status: string
  clients: { name: string } | null
}

interface TodayData {
  todayEarnings: number
  todayCommission: number
  todayTips: number
  todayServices: number
  services: ServiceEntry[]
  appointments: Appointment[]
  todayPenalty: number
  todayAttStatus: string | null
  todayCheckedInAt: string | null
  checkinStatus: 'pending' | 'confirmed' | 'dismissed' | null
}

// Mon-Sat: 6:30am – 1:00pm  |  Sunday: 10:00am – 2:00pm
function getCheckinWindow(): { open: boolean; reason: string } {
  const lagosStr  = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const [h, m] = lagosStr.split(':').map(Number)
  const mins   = h * 60 + m

  const lagosDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const isSunday  = new Date(lagosDate + 'T12:00:00').getDay() === 0

  if (isSunday) {
    if (mins < 10 * 60)  return { open: false, reason: 'Check-in opens at 10:00am' }
    if (mins > 14 * 60)  return { open: false, reason: 'Check-in closed for today' }
    return { open: true, reason: '' }
  }
  if (mins < 6 * 60 + 30) return { open: false, reason: 'Check-in opens at 6:30am' }
  if (mins > 15 * 60)     return { open: false, reason: 'Check-in closed for today' }
  return { open: true, reason: '' }
}

function fmtTime(t: string) {
  // t is HH:MM or HH:MM:SS
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12    = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-[var(--border)] text-[var(--text-muted)] border-[var(--border-strong)]',
  pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
}

function fmt12h(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos',
  })
}

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

export default function StaffHome() {
  const router = useRouter()
  const [user, setUser]             = useState<{ name: string; id: string } | null>(null)
  const [data, setData]             = useState<TodayData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [window_, setWindow_]       = useState(getCheckinWindow)

  const load = useCallback(async () => {
    const session = getSession()
    if (!session) { router.replace('/login'); return }
    setUser({ name: session.name, id: session.id })
    const res = await fetch(`/api/staff/today?staffId=${session.id}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // Refresh window state every minute (in case the window opens/closes while page is open)
  useEffect(() => {
    const id = setInterval(() => setWindow_(getCheckinWindow()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Auto-poll every 12 seconds while waiting for manager confirmation
  useEffect(() => {
    if (data?.checkinStatus !== 'pending' || !user) return
    const id = setInterval(async () => {
      const res = await fetch(`/api/staff/today?staffId=${user.id}`)
      if (res.ok) setData(await res.json())
    }, 12_000)
    return () => clearInterval(id)
  }, [data?.checkinStatus, user])

  async function checkIn() {
    if (!user) return
    setCheckingIn(true)
    await fetch('/api/staff/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: user.id }),
    })
    setCheckingIn(false)
    const res = await fetch(`/api/staff/today?staffId=${user.id}`)
    if (res.ok) setData(await res.json())
  }

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos',
  })

  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <div className="px-6 lg:px-10 py-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[var(--text-dim)] text-sm mb-1">{today}</p>
        <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">
          Good {greeting()}, {firstName}
        </h1>
      </div>

      {/* Penalty notice */}
      {!loading && (data?.todayPenalty ?? 0) > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3.5 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-red-400 text-sm font-semibold">
                {data?.todayAttStatus === 'absent' ? 'Marked absent today' : 'Late arrival today'}
              </p>
              <p className="text-red-400/70 text-xs mt-0.5">
                ₦{(data?.todayPenalty ?? 0).toLocaleString('en-NG')} penalty recorded
              </p>
            </div>
          </div>
          <span className="text-red-400 font-bold text-sm tabular-nums flex-shrink-0">
            -{fmtNaira(data?.todayPenalty ?? 0)}
          </span>
        </div>
      )}

      {/* Check-in card */}
      {!loading && (
        <>
          {/* Already confirmed — green badge */}
          {data?.todayAttStatus && data.todayAttStatus !== 'absent' && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3.5 mb-4 flex items-center gap-3">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-emerald-400 text-sm font-semibold">
                  Checked in {data.todayCheckedInAt ? `at ${fmtTime(data.todayCheckedInAt)}` : ''}
                </p>
                <p className="text-[var(--text-dim)] text-xs mt-0.5">
                  {data.todayAttStatus === 'on_time' ? 'On time — no penalty' : `Late — ₦${data.todayPenalty.toLocaleString('en-NG')} deducted`}
                </p>
              </div>
            </div>
          )}

          {/* No record yet — show check-in button or pending state */}
          {data?.todayAttStatus === null && (
            <div className={`rounded-xl border px-4 py-4 mb-4 ${
              data.checkinStatus === 'pending'
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-[var(--card)] border-[var(--border)]'
            }`}>
              {data.checkinStatus === 'pending' ? (
                /* State 3: waiting — auto-polls every 12s */
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                    <div>
                      <p className="text-amber-400 text-sm font-semibold">Waiting for confirmation…</p>
                      <p className="text-[var(--text-dim)] text-xs mt-0.5">Cajetan will confirm when he sees you</p>
                    </div>
                  </div>
                  <button onClick={load} className="text-[var(--text-faint)] text-xs hover:text-[var(--text)] transition-colors">
                    Refresh
                  </button>
                </div>
              ) : window_.open ? (
                /* State 2: window open — show button */
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[var(--text)] text-sm font-semibold">Ready to check in?</p>
                    <p className="text-[var(--text-dim)] text-xs mt-0.5">Tap when you arrive at the salon</p>
                  </div>
                  <button
                    onClick={checkIn}
                    disabled={checkingIn}
                    className="bg-[var(--text)] text-[var(--bg)] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    {checkingIn ? 'Sending…' : 'Check In'}
                  </button>
                </div>
              ) : (
                /* State 1: outside window — disabled */
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[var(--text-dim)] text-sm font-medium">{window_.reason}</p>
                    <p className="text-[var(--text-faint)] text-xs mt-0.5">Mon–Sat: 6:30am – 3:00pm · Sunday: 10:00am – 2:00pm</p>
                  </div>
                  <button disabled
                    className="bg-[var(--elevated)] text-[var(--text-faint)] font-semibold text-sm px-5 py-2.5 rounded-xl cursor-not-allowed border border-[var(--border-strong)]">
                    Check In
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Today's earnings hero */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-6">
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-24 bg-[var(--border-strong)] rounded" />
            <div className="h-9 w-40 bg-[var(--border-strong)] rounded" />
            <div className="h-3 w-32 bg-[var(--border-strong)] rounded" />
          </div>
        ) : (
          <>
            <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">Your earnings today</p>
            <p className="text-[var(--text)] text-4xl font-bold tracking-tight tabular-nums">
              {fmtNaira(data?.todayEarnings ?? 0)}
            </p>
            <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-3">
              <div>
                <p className="text-[var(--text-dim)] text-xs mb-1">Commission</p>
                <p className="text-[var(--text)] text-base font-semibold tabular-nums">{fmtNaira(data?.todayCommission ?? 0)}</p>
              </div>
              <div>
                <p className="text-[var(--text-dim)] text-xs mb-1">Tips</p>
                <p className={`text-base font-semibold tabular-nums ${(data?.todayTips ?? 0) > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-faint)]'}`}>
                  {fmtNaira(data?.todayTips ?? 0)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Two stat mini-cards */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">Services done</p>
            <p className="text-[var(--text)] text-2xl font-bold">{data?.todayServices ?? 0}</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">Appointments</p>
            <p className="text-[var(--text)] text-2xl font-bold">{data?.appointments.length ?? 0}</p>
          </div>
        </div>
      )}

      {/* Today's Appointments */}
      {!loading && (data?.appointments.length ?? 0) > 0 && (
        <section className="mb-8">
          <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-4">Your Appointments Today</h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
            {data!.appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-[var(--text)] text-sm font-medium">{a.clients?.name ?? '—'}</p>
                  <p className="text-[var(--text-dim)] text-xs mt-0.5">{fmt12h(a.scheduled_at)}</p>
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border capitalize ${
                  STATUS_STYLES[a.status] ?? STATUS_STYLES.pending
                }`}>
                  {a.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services done today */}
      {!loading && (data?.services.length ?? 0) > 0 && (
        <section className="mb-8">
          <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-4">Services Completed Today</h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
            {data!.services.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-[var(--text)] text-sm font-medium">{s.services?.name ?? '—'}</p>
                  <p className="text-[var(--text-dim)] text-xs mt-0.5">
                    {s.visits?.clients?.name ?? 'Unknown client'} · {fmt12h(s.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[var(--accent)] text-sm font-semibold tabular-nums">
                    {fmtNaira(s.commission_ngn)}
                  </p>
                  <p className="text-[var(--text-faint)] text-xs tabular-nums">of {fmtNaira(s.price_ngn)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && data?.todayServices === 0 && data?.appointments.length === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-12 text-center">
          <p className="text-[var(--text-dim)] text-sm">Nothing recorded yet today.</p>
          <p className="text-[var(--text-faint)] text-sm mt-1">Services will appear here after the manager logs them.</p>
        </div>
      )}

      {/* Link to history */}
      <Link href="/dashboard/staff/history"
        className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl px-5 py-4 transition-colors group mt-2">
        <div>
          <p className="text-[var(--text)] text-sm font-semibold">My Earnings History</p>
          <p className="text-[var(--text-dim)] text-xs mt-0.5">See your weekly and monthly totals</p>
        </div>
        <svg className="w-4 h-4 text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>
    </div>
  )
}
