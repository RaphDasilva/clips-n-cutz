'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface Point { date: string; label: string; revenue: number }

function fmtNaira(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}K`
  return `₦${n}`
}

function fmtNairaFull(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--elevated)] border border-[var(--border-strong)] rounded-xl px-3 py-2.5 shadow-xl">
      <p className="text-[var(--text-muted)] text-[11px] mb-1">{label}</p>
      <p className="text-[var(--text)] text-sm font-bold tabular-nums">{fmtNairaFull(payload[0].value)}</p>
    </div>
  )
}

export default function RevenueChart() {
  const [range, setRange]     = useState<7 | 30>(7)
  const [points, setPoints]   = useState<Point[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/owner/chart?days=${range}`)
      .then(r => r.ok ? r.json() : { points: [] })
      .then(d => { setPoints(d.points ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [range])

  const total   = points.reduce((s, p) => s + p.revenue, 0)
  const maxRev  = Math.max(...points.map(p => p.revenue), 1)
  const hasDdata = points.some(p => p.revenue > 0)

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider">Revenue</h2>
        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-lg p-0.5 gap-0.5">
          {([7, 30] as const).map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                range === d ? 'bg-[var(--text)] text-[var(--bg)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}>
              {d === 7 ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {/* Summary row */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <p className="text-[var(--text-dim)] text-xs mb-1">Total — last {range} days</p>
          {loading
            ? <div className="h-7 w-32 bg-[var(--border)] rounded animate-pulse" />
            : <p className="text-[var(--text)] text-2xl font-bold tabular-nums tracking-tight">{fmtNairaFull(total)}</p>
          }
        </div>

        {/* Chart */}
        <div className="px-2 pt-4 pb-2">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[var(--border-strong)] border-t-[#555] rounded-full animate-spin" />
            </div>
          ) : !hasDdata ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-[var(--text-faint)] text-sm">No revenue data for this period.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--accent)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={range === 30 ? 4 : 0}
                />
                <YAxis
                  tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtNaira}
                  width={48}
                  domain={[0, maxRev * 1.2]}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  )
}
