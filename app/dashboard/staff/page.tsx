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
  todayServices: number
  services: ServiceEntry[]
  appointments: Appointment[]
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-[#1e1e1e] text-[#888] border-[#2a2a2a]',
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
  const [user, setUser]   = useState<{ name: string; id: string } | null>(null)
  const [data, setData]   = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const session = getSession()
    if (!session) { router.replace('/login'); return }
    setUser({ name: session.name, id: session.id })

    const res = await fetch(`/api/staff/today?staffId=${session.id}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos',
  })

  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <div className="px-6 lg:px-10 py-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[#555] text-sm mb-1">{today}</p>
        <h1 className="text-white text-2xl font-bold tracking-tight">
          Good {greeting()}, {firstName}
        </h1>
      </div>

      {/* Today's earnings hero */}
      <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-6 mb-6">
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-24 bg-[#2a2a2a] rounded" />
            <div className="h-9 w-40 bg-[#2a2a2a] rounded" />
            <div className="h-3 w-32 bg-[#2a2a2a] rounded" />
          </div>
        ) : (
          <>
            <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-2">Your earnings today</p>
            <p className="text-white text-4xl font-bold tracking-tight tabular-nums">
              {fmtNaira(data?.todayEarnings ?? 0)}
            </p>
            <p className="text-[#555] text-sm mt-2">
              {data?.todayServices ?? 0} service{(data?.todayServices ?? 0) !== 1 ? 's' : ''} completed
            </p>
          </>
        )}
      </div>

      {/* Two stat mini-cards */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-2">Services done</p>
            <p className="text-white text-2xl font-bold">{data?.todayServices ?? 0}</p>
          </div>
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-2">Appointments</p>
            <p className="text-white text-2xl font-bold">{data?.appointments.length ?? 0}</p>
          </div>
        </div>
      )}

      {/* Today's Appointments */}
      {!loading && (data?.appointments.length ?? 0) > 0 && (
        <section className="mb-8">
          <h2 className="text-[#555] text-xs font-semibold uppercase tracking-wider mb-4">Your Appointments Today</h2>
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden divide-y divide-[#1e1e1e]">
            {data!.appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-white text-sm font-medium">{a.clients?.name ?? '—'}</p>
                  <p className="text-[#555] text-xs mt-0.5">{fmt12h(a.scheduled_at)}</p>
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
          <h2 className="text-[#555] text-xs font-semibold uppercase tracking-wider mb-4">Services Completed Today</h2>
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden divide-y divide-[#1e1e1e]">
            {data!.services.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-white text-sm font-medium">{s.services?.name ?? '—'}</p>
                  <p className="text-[#555] text-xs mt-0.5">
                    {s.visits?.clients?.name ?? 'Unknown client'} · {fmt12h(s.created_at)}
                  </p>
                </div>
                <p className="text-[#C49A3C] text-sm font-semibold tabular-nums">
                  {fmtNaira(s.commission_ngn)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && data?.todayServices === 0 && data?.appointments.length === 0 && (
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl px-4 py-12 text-center">
          <p className="text-[#555] text-sm">Nothing recorded yet today.</p>
          <p className="text-[#333] text-sm mt-1">Services will appear here after the manager logs them.</p>
        </div>
      )}

      {/* Link to history */}
      <Link href="/dashboard/staff/history"
        className="flex items-center justify-between bg-[#141414] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl px-5 py-4 transition-colors group mt-2">
        <div>
          <p className="text-white text-sm font-semibold">My Earnings History</p>
          <p className="text-[#555] text-xs mt-0.5">See your weekly and monthly totals</p>
        </div>
        <svg className="w-4 h-4 text-[#444] group-hover:text-[#888] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>
    </div>
  )
}
