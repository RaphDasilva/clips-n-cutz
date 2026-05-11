'use client'

import { useState } from 'react'

interface Summary {
  totalRevenue: number
  totalCommission: number
  totalVisits: number
  totalServices: number
  ownerProfit: number
}

interface ServiceBreakdown { name: string; count: number; revenue: number }
interface StaffBreakdown   { name: string; services: number; revenue: number; commission: number }
interface VisitRow {
  id: string; visit_date: string; total_ngn: number
  clients: { name: string; phone: string } | null
  users:   { name: string } | null
}

interface ReportData {
  summary: Summary
  byService: ServiceBreakdown[]
  byStaff: StaffBreakdown[]
  visits: VisitRow[]
}

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }
function fmtDate(d: string)  {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function lagosToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

function monthStart() {
  return lagosToday().slice(0, 7) + '-01'
}

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStart())
  const [to, setTo]     = useState(lagosToday())
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [ran, setRan]   = useState(false)
  const [error, setError] = useState('')

  async function run() {
    if (!from || !to) return
    setLoading(true); setError(''); setRan(true)
    const res = await fetch(`/api/owner/reports?from=${from}&to=${to}`)
    if (res.ok) setData(await res.json())
    else setError('Failed to generate report. Try again.')
    setLoading(false)
  }

  const maxServiceRev = data?.byService[0]?.revenue ?? 1
  const maxStaffRev   = data?.byStaff[0]?.revenue   ?? 1

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-[#555] text-sm mt-0.5">Choose a date range to generate a full financial report</p>
      </div>

      {/* Date range picker */}
      <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-[#888] text-xs font-medium mb-1.5">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              max={to} className="input" />
          </div>
          <div className="flex-1">
            <label className="block text-[#888] text-xs font-medium mb-1.5">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              min={from} max={lagosToday()} className="input" />
          </div>
          <button onClick={run} disabled={loading || !from || !to}
            className="sm:w-auto w-full bg-white text-gray-950 font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-gray-100 disabled:opacity-40 active:scale-[0.98] transition-all whitespace-nowrap">
            {loading ? 'Generating…' : 'Run Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[0,1,2,3,4].map(i => <div key={i} className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-20 animate-pulse" />)}
          </div>
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-48 animate-pulse" />
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-48 animate-pulse" />
        </div>
      )}

      {/* Results */}
      {!loading && ran && data && (
        <>
          {/* Summary cards */}
          <section className="mb-8">
            <h2 className="text-[#555] text-xs font-semibold uppercase tracking-wider mb-4">
              Summary · {fmtDate(from)} – {fmtDate(to)}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <SummaryCard label="Total Revenue"    value={fmtNaira(data.summary.totalRevenue)}    />
              <SummaryCard label="Your Earnings"    value={fmtNaira(data.summary.ownerProfit)}     accent="gold" />
              <SummaryCard label="Commission Owed"  value={fmtNaira(data.summary.totalCommission)} accent="amber" />
              <SummaryCard label="Visits"           value={String(data.summary.totalVisits)}       />
              <SummaryCard label="Services Done"    value={String(data.summary.totalServices)}     />
            </div>
          </section>

          {/* Two columns: by service + by staff */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

            {/* By service */}
            <section>
              <h2 className="text-[#555] text-xs font-semibold uppercase tracking-wider mb-4">Revenue by Service</h2>
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden divide-y divide-[#1e1e1e]">
                {data.byService.length === 0
                  ? <EmptyRow text="No services in this period." />
                  : data.byService.map(s => (
                  <div key={s.name} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white text-sm font-medium">{s.name}</p>
                      <p className="text-white text-sm font-semibold tabular-nums">{fmtNaira(s.revenue)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#1e1e1e] rounded-full h-1">
                        <div className="bg-white/30 h-1 rounded-full"
                          style={{ width: `${Math.round((s.revenue / maxServiceRev) * 100)}%` }} />
                      </div>
                      <span className="text-[#555] text-xs">{s.count}×</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* By staff */}
            <section>
              <h2 className="text-[#555] text-xs font-semibold uppercase tracking-wider mb-4">Revenue by Staff</h2>
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden divide-y divide-[#1e1e1e]">
                {data.byStaff.length === 0
                  ? <EmptyRow text="No staff data in this period." />
                  : data.byStaff.map(s => (
                  <div key={s.name} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-semibold">{s.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <p className="text-white text-sm font-medium">{s.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-semibold tabular-nums">{fmtNaira(s.revenue)}</p>
                        <p className="text-amber-400 text-xs tabular-nums">{fmtNaira(s.commission)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#1e1e1e] rounded-full h-1">
                        <div className="bg-white/30 h-1 rounded-full"
                          style={{ width: `${Math.round((s.revenue / maxStaffRev) * 100)}%` }} />
                      </div>
                      <span className="text-[#555] text-xs">{s.services} svcs</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Visit log */}
          {data.visits.length > 0 && (
            <section>
              <h2 className="text-[#555] text-xs font-semibold uppercase tracking-wider mb-4">
                Visit Log <span className="normal-case text-[#333]">(up to 50 most recent)</span>
              </h2>

              {/* Desktop */}
              <div className="hidden lg:block bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1e1e1e]">
                      <th className="text-left text-[#555] text-xs font-medium px-5 py-3">Date</th>
                      <th className="text-left text-[#555] text-xs font-medium px-5 py-3">Client</th>
                      <th className="text-left text-[#555] text-xs font-medium px-5 py-3">Staff</th>
                      <th className="text-right text-[#555] text-xs font-medium px-5 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e]">
                    {data.visits.map(v => (
                      <tr key={v.id} className="hover:bg-[#1a1a1a] transition-colors">
                        <td className="px-5 py-3 text-[#888]">{fmtDate(v.visit_date)}</td>
                        <td className="px-5 py-3">
                          <p className="text-white font-medium">{v.clients?.name ?? '—'}</p>
                          <p className="text-[#555] text-xs">{v.clients?.phone}</p>
                        </td>
                        <td className="px-5 py-3 text-[#888]">{v.users?.name ?? '—'}</td>
                        <td className="px-5 py-3 text-right text-white font-semibold tabular-nums">
                          {fmtNaira(v.total_ngn)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="lg:hidden space-y-2">
                {data.visits.map(v => (
                  <div key={v.id} className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{v.clients?.name ?? '—'}</p>
                        <p className="text-[#555] text-xs">{v.users?.name} · {fmtDate(v.visit_date)}</p>
                      </div>
                      <p className="text-white text-sm font-bold tabular-nums">{fmtNaira(v.total_ngn)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Pre-run empty state */}
      {!ran && !loading && (
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-16 text-center">
          <p className="text-[#444] text-sm">Select a date range above and tap Run Report.</p>
          <p className="text-[#333] text-xs mt-1">Default range is this month.</p>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: 'gold' | 'amber' }) {
  return (
    <div className={`bg-[#141414] rounded-xl p-4 border ${
      accent === 'gold'  ? 'border-[#C49A3C]/30' :
      accent === 'amber' ? 'border-amber-500/20'  :
      'border-[#1e1e1e]'
    }`}>
      <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${
        accent === 'gold'  ? 'text-[#C49A3C]' :
        accent === 'amber' ? 'text-amber-400'  :
        'text-white'
      }`}>{value}</p>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-5 py-8 text-center text-[#444] text-sm">{text}</div>
}
