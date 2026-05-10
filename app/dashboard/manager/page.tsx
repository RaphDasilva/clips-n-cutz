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
}

interface TodayAppointment {
  id: string
  scheduled_at: string
  status: string
  clients: { name: string } | null
}

interface TodayData {
  visitCount: number
  appointmentCount: number
  visits: TodayVisit[]
  appointments: TodayAppointment[]
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-[#1e1e1e] text-[#888] border-[#2a2a2a]',
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
    <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
      <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-3">{label}</p>
      <p className="text-white text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-[#555] text-xs mt-1.5">{sub}</p>}
    </div>
  )
}

export default function ManagerHome() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const session = getSession()
    if (!session) { router.replace('/login'); return }
    setUserName(session.name.split(' ')[0])
    const res = await fetch('/api/manager/today')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos',
  })

  const totalRevenue = data?.visits.reduce((s, v) => s + v.total_ngn, 0) ?? 0

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[#555] text-sm mb-1">{today}</p>
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Good {getGreeting()}, {userName}
          </h1>
        </div>
        <Link
          href="/dashboard/manager/walk-in"
          className="inline-flex items-center gap-2 bg-white text-gray-950 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-100 active:scale-[0.98] transition-all w-fit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Walk-in
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[0,1,2].map(i => (
            <div key={i} className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard label="Walk-ins today" value={data?.visitCount ?? 0} />
          <StatCard label="Appointments" value={data?.appointmentCount ?? 0} />
          <StatCard
            label="Revenue today"
            value={fmtNaira(totalRevenue)}
            sub="from walk-ins"
          />
        </div>
      )}

      {/* Two-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's Appointments */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-sm font-semibold">Today&apos;s Appointments</h2>
            <span className="text-[#555] text-xs">{data?.appointmentCount ?? 0} total</span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[0,1,2].map(i => <div key={i} className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-14 animate-pulse" />)}
            </div>
          ) : data?.appointments.length === 0 ? (
            <Empty text="No appointments scheduled for today." />
          ) : (
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden divide-y divide-[#1e1e1e]">
              {data!.appointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="text-white text-sm font-medium">{a.clients?.name ?? '—'}</p>
                    <p className="text-[#555] text-xs mt-0.5">{fmt12h(a.scheduled_at)}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[a.status] ?? STATUS_STYLES.pending}`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Walk-ins */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-sm font-semibold">Recent Walk-ins</h2>
            <span className="text-[#555] text-xs">{data?.visitCount ?? 0} today</span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[0,1,2].map(i => <div key={i} className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-14 animate-pulse" />)}
            </div>
          ) : data?.visits.length === 0 ? (
            <Empty text="No walk-ins logged today yet." />
          ) : (
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden divide-y divide-[#1e1e1e]">
              {data!.visits.slice(0, 6).map((v) => (
                <div key={v.id} className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="text-white text-sm font-medium">{v.clients?.name ?? '—'}</p>
                    <p className="text-[#555] text-xs mt-0.5">{fmt12h(v.created_at)}</p>
                  </div>
                  <p className="text-white text-sm font-semibold tabular-nums">{fmtNaira(v.total_ngn)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-8 text-center">
      <p className="text-[#444] text-sm">{text}</p>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
