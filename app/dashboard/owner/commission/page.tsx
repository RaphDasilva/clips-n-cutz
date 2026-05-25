'use client'

import { useEffect, useState, useCallback } from 'react'

interface StaffCommission {
  staffId: string
  staffName: string
  servicesCount: number
  totalValue: number
  totalCommission: number
  tips: number
  totalPayout: number
}

interface CommissionData {
  breakdown: StaffCommission[]
  totalRevenue: number
  totalCommission: number
  totalTips: number
  totalPayout: number
  totalServices: number
}

function fmtNaira(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

function lagosToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

function weekStart() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }))
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  now.setDate(now.getDate() + diff)
  return now.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

function monthStart() {
  return lagosToday().slice(0, 7) + '-01'
}

const PERIODS = [
  { label: 'Today',      getRange: () => ({ from: lagosToday(),  to: lagosToday()  }) },
  { label: 'This week',  getRange: () => ({ from: weekStart(),   to: lagosToday()  }) },
  { label: 'This month', getRange: () => ({ from: monthStart(),  to: lagosToday()  }) },
]

export default function CommissionPage() {
  const [period, setPeriod]   = useState(2) // default: this month
  const [data, setData]       = useState<CommissionData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (idx: number) => {
    setLoading(true)
    const { from, to } = PERIODS[idx].getRange()
    const res = await fetch(`/api/owner/commission?from=${from}&to=${to}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load(period) }, [load, period])

  const maxPayout = data?.breakdown[0]?.totalPayout ?? 1

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Commission</h1>
          <p className="text-[var(--text-dim)] text-sm mt-0.5">30% of each service goes to the staff member who performed it</p>
        </div>
        {/* Period tabs */}
        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-xl p-1 gap-1">
          {PERIODS.map((p, i) => (
            <button key={p.label} onClick={() => { setPeriod(i); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === i ? 'bg-[var(--text)] text-[var(--bg)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      {!loading && data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">Service Revenue</p>
            <p className="text-[var(--text)] text-xl font-bold tabular-nums">{fmtNaira(data.totalRevenue)}</p>
          </div>
          <div className="bg-[var(--card)] border border-amber-500/20 rounded-xl p-4">
            <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">Commission (30%)</p>
            <p className="text-amber-400 text-xl font-bold tabular-nums">{fmtNaira(data.totalCommission)}</p>
          </div>
          <div className="bg-[var(--card)] border border-emerald-500/20 rounded-xl p-4">
            <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">Tips Collected</p>
            <p className="text-emerald-400 text-xl font-bold tabular-nums">{fmtNaira(data.totalTips)}</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--accent)]/30 rounded-xl p-4">
            <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">Total Staff Payout</p>
            <p className="text-[var(--accent)] text-xl font-bold tabular-nums">{fmtNaira(data.totalPayout)}</p>
          </div>
        </div>
      )}

      {/* Staff breakdown */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : !data || data.breakdown.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-16 text-center">
          <p className="text-[var(--text-faint)] text-sm">No services recorded for this period.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Staff Member</th>
                  <th className="text-right text-[var(--text-dim)] text-xs font-medium px-5 py-3">Services</th>
                  <th className="text-right text-[var(--text-dim)] text-xs font-medium px-5 py-3">Revenue Generated</th>
                  <th className="text-right text-[var(--text-dim)] text-xs font-medium px-5 py-3">Commission</th>
                  <th className="text-right text-[var(--text-dim)] text-xs font-medium px-5 py-3">Tips</th>
                  <th className="text-right text-[var(--text-dim)] text-xs font-medium px-5 py-3">Total Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.breakdown.map((s) => {
                  const barPct = Math.round((s.totalPayout / maxPayout) * 100)
                  return (
                    <tr key={s.staffId} className="hover:bg-[var(--elevated)] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--border)] border border-[var(--border-strong)] flex items-center justify-center flex-shrink-0">
                            <span className="text-[var(--text)] text-xs font-semibold">{s.staffName.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-[var(--text)] font-medium">{s.staffName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-[var(--text-muted)]">{s.servicesCount}</td>
                      <td className="px-5 py-4 text-right text-[var(--text)] font-medium tabular-nums">
                        {fmtNaira(s.totalValue)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-amber-400 font-semibold tabular-nums">{fmtNaira(s.totalCommission)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`tabular-nums ${s.tips > 0 ? 'text-emerald-400 font-semibold' : 'text-[var(--text-faint)]'}`}>
                          {s.tips > 0 ? fmtNaira(s.tips) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 min-w-[140px]">
                          <div className="flex-1 max-w-[60px] bg-[var(--border)] rounded-full h-1.5">
                            <div className="bg-[var(--accent)] h-1.5 rounded-full transition-all"
                              style={{ width: `${barPct}%` }} />
                          </div>
                          <span className="text-[var(--accent)] font-bold tabular-nums">{fmtNaira(s.totalPayout)}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-[var(--border-strong)]">
                <tr className="bg-[var(--elevated)]">
                  <td className="px-5 py-3 text-[var(--text-muted)] text-xs font-medium">Total</td>
                  <td className="px-5 py-3 text-right text-[var(--text-muted)] text-xs">{data.totalServices}</td>
                  <td className="px-5 py-3 text-right text-[var(--text)] text-xs font-semibold tabular-nums">
                    {fmtNaira(data.totalRevenue)}
                  </td>
                  <td className="px-5 py-3 text-right text-amber-400 text-xs font-semibold tabular-nums">
                    {fmtNaira(data.totalCommission)}
                  </td>
                  <td className="px-5 py-3 text-right text-emerald-400 text-xs font-semibold tabular-nums">
                    {fmtNaira(data.totalTips)}
                  </td>
                  <td className="px-5 py-3 text-right text-[var(--accent)] text-xs font-bold tabular-nums">
                    {fmtNaira(data.totalPayout)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {data.breakdown.map((s) => {
              const barPct = Math.round((s.totalPayout / maxPayout) * 100)
              return (
                <div key={s.staffId} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--border)] border border-[var(--border-strong)] flex items-center justify-center">
                        <span className="text-[var(--text)] text-xs font-semibold">{s.staffName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-[var(--text)] text-sm font-medium">{s.staffName}</p>
                        <p className="text-[var(--text-dim)] text-xs">{s.servicesCount} services</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--accent)] text-sm font-bold tabular-nums">{fmtNaira(s.totalPayout)}</p>
                      <p className="text-[var(--text-dim)] text-xs">total payout</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[var(--text-dim)]">Commission</p>
                      <p className="text-amber-400 font-semibold tabular-nums">{fmtNaira(s.totalCommission)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-dim)]">Tips</p>
                      <p className={`tabular-nums ${s.tips > 0 ? 'text-emerald-400 font-semibold' : 'text-[var(--text-faint)]'}`}>
                        {s.tips > 0 ? fmtNaira(s.tips) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 bg-[var(--border)] rounded-full h-1.5">
                      <div className="bg-[var(--accent)] h-1.5 rounded-full" style={{ width: `${barPct}%` }} />
                    </div>
                    <span className="text-[var(--text-dim)] text-xs">{fmtNaira(s.totalValue)} revenue</span>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-[var(--text-faint)] text-xs text-center mt-4">
            Showing {data.breakdown.length} staff member{data.breakdown.length !== 1 ? 's' : ''} · {PERIODS[period].label.toLowerCase()}
          </p>
        </>
      )}
    </div>
  )
}
