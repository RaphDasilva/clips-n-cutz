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
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 shadow-xl">
      <p className="text-[#888] text-[11px] mb-1">{label}</p>
      <p className="text-white text-sm font-bold tabular-nums">{fmtNairaFull(payload[0].value)}</p>
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
        <h2 className="text-[#555] text-xs font-semibold uppercase tracking-wider">Revenue</h2>
        <div className="flex bg-[#141414] border border-[#1e1e1e] rounded-lg p-0.5 gap-0.5">
          {([7, 30] as const).map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                range === d ? 'bg-white text-gray-950' : 'text-[#666] hover:text-white'
              }`}>
              {d === 7 ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {/* Summary row */}
        <div className="px-5 pt-5 pb-4 border-b border-[#1e1e1e]">
          <p className="text-[#555] text-xs mb-1">Total — last {range} days</p>
          {loading
            ? <div className="h-7 w-32 bg-[#1e1e1e] rounded animate-pulse" />
            : <p className="text-white text-2xl font-bold tabular-nums tracking-tight">{fmtNairaFull(total)}</p>
          }
        </div>

        {/* Chart */}
        <div className="px-2 pt-4 pb-2">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-[#555] rounded-full animate-spin" />
            </div>
          ) : !hasDdata ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-[#333] text-sm">No revenue data for this period.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#C49A3C" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#C49A3C" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e1e1e"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#555', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={range === 30 ? 4 : 0}
                />
                <YAxis
                  tick={{ fill: '#555', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtNaira}
                  width={48}
                  domain={[0, maxRev * 1.2]}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2a2a2a', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#C49A3C"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#C49A3C', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  )
}
