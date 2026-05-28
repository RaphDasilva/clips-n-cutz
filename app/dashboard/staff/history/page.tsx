'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useClientMask } from '@/lib/demo-mode'

interface HistoryEntry {
  serviceName: string
  clientName: string
  earnings: number
  price: number
  materialCost: number
}

interface DayGroup {
  date: string
  entries: HistoryEntry[]
  tip: number
  dayEarnings: number
}

interface HistoryData {
  totalEarnings: number
  totalCommission: number
  totalTips: number
  totalServices: number
  grouped: DayGroup[]
}

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }

function fmtDate(d: string) {
  const date = new Date(d + 'T00:00:00')
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  if (d === today)     return 'Today'
  if (d === yesterday) return 'Yesterday'
  return date.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })
}

function lagosToday()  { return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) }
function weekStart() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }))
  const diff = now.getDay() === 0 ? -6 : 1 - now.getDay()
  now.setDate(now.getDate() + diff)
  return now.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}
function monthStart() { return lagosToday().slice(0, 7) + '-01' }

const PERIODS = [
  { label: 'This week',  from: weekStart,  to: lagosToday },
  { label: 'This month', from: monthStart, to: lagosToday },
]

export default function StaffHistory() {
  const router = useRouter()
  const mask = useClientMask()
  const [staffId, setStaffId] = useState<string | null>(null)
  const [period, setPeriod]   = useState(1)
  const [data, setData]       = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (pid: number, sid: string) => {
    setLoading(true)
    const from = PERIODS[pid].from()
    const to   = PERIODS[pid].to()
    const res  = await fetch(`/api/staff/history?staffId=${sid}&from=${from}&to=${to}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    const session = getSession()
    if (!session) { router.replace('/login'); return }
    setStaffId(session.id)
    load(period, session.id)
  }, [router, load, period])

  function changePeriod(idx: number) {
    setPeriod(idx)
    if (staffId) load(idx, staffId)
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">My Earnings</h1>
          <p className="text-[var(--text-dim)] text-sm mt-0.5">Your cut from every service you performed</p>
        </div>
        {/* Period tabs */}
        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-xl p-1 gap-1">
          {PERIODS.map((p, i) => (
            <button key={p.label} onClick={() => changePeriod(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === i ? 'bg-[var(--text)] text-[var(--bg)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-24 animate-pulse" />
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-24 animate-pulse" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[var(--card)] border border-[var(--accent)]/30 rounded-xl p-5">
              <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">Total Earnings</p>
              <p className="text-[var(--accent)] text-3xl font-bold tracking-tight tabular-nums">
                {fmtNaira(data?.totalEarnings ?? 0)}
              </p>
              <p className="text-[var(--text-dim)] text-xs mt-1">{PERIODS[period].label.toLowerCase()}</p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">Services Done</p>
              <p className="text-[var(--text)] text-3xl font-bold tracking-tight">
                {data?.totalServices ?? 0}
              </p>
              <p className="text-[var(--text-dim)] text-xs mt-1.5">{PERIODS[period].label.toLowerCase()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">Commission</p>
              <p className="text-[var(--text)] text-2xl font-bold tabular-nums">
                {fmtNaira(data?.totalCommission ?? 0)}
              </p>
              <p className="text-[var(--text-dim)] text-xs mt-1">30% of services</p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--accent)]/20 rounded-xl p-5">
              <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">Tips</p>
              <p className={`text-2xl font-bold tabular-nums ${(data?.totalTips ?? 0) > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-faint)]'}`}>
                {fmtNaira(data?.totalTips ?? 0)}
              </p>
              <p className="text-[var(--text-dim)] text-xs mt-1">100% yours</p>
            </div>
          </div>
        </>
      )}

      {/* Day-grouped service list */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i}>
              <div className="h-3 w-20 bg-[var(--border)] rounded mb-2 animate-pulse" />
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-28 animate-pulse" />
            </div>
          ))}
        </div>
      ) : !data || data.grouped.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-16 text-center">
          <p className="text-[var(--text-faint)] text-sm">No services recorded for this period.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.grouped.map((day) => (
            <section key={day.date}>
              {/* Day header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
                  {fmtDate(day.date)}
                </span>
                <div className="flex items-center gap-2">
                  {(day.tip ?? 0) > 0 && (
                    <span className="text-[var(--accent)]/70 text-xs tabular-nums">
                      +{fmtNaira(day.tip)} tip
                    </span>
                  )}
                  <span className="text-[var(--accent)] text-xs font-semibold tabular-nums">
                    {fmtNaira(day.dayEarnings)}
                  </span>
                </div>
              </div>

              {/* Service rows */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
                {day.entries.map((e, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-[var(--text)] text-sm font-medium">{e.serviceName}</p>
                      <p className="text-[var(--text-dim)] text-xs mt-0.5">{mask.name(e.clientName)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--accent)] text-sm font-semibold tabular-nums">
                        {fmtNaira(e.earnings)}
                      </p>
                      {e.materialCost > 0 ? (
                        <p className="text-[var(--text-faint)] text-[11px] tabular-nums leading-tight">
                          30% of {fmtNaira(e.price - e.materialCost)} service<br />
                          {fmtNaira(e.materialCost)} product → salon
                        </p>
                      ) : (
                        <p className="text-[var(--text-faint)] text-xs tabular-nums">
                          of {fmtNaira(e.price)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
