'use client'

import { useState } from 'react'
import { useClientMask } from '@/lib/demo-mode'

interface Summary {
  totalRevenue: number
  totalCommission: number
  totalTips: number
  totalPayout: number
  totalVisits: number
  totalServices: number
  ownerProfit: number
}

interface ServiceBreakdown { name: string; count: number; revenue: number }
interface StaffBreakdown   { name: string; services: number; revenue: number; commission: number; tips: number; totalPayout: number }
interface VisitRow {
  id: string; visit_date: string; total_ngn: number; tip_ngn: number; payment_method: string
  clients: { name: string; phone: string | null } | null
  users:   { name: string } | null
}

interface PaymentBreakdown { cash: number; transfer: number; pos: number }

interface ReportData {
  summary: Summary
  byPayment: PaymentBreakdown
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
  const mask = useClientMask()
  const [from, setFrom] = useState(monthStart())
  const [to, setTo]     = useState(lagosToday())
  const [payment, setPayment] = useState<'all' | 'cash' | 'transfer' | 'pos'>('all')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [ran, setRan]   = useState(false)
  const [error, setError] = useState('')

  async function run() {
    if (!from || !to) return
    setLoading(true); setError(''); setRan(true)
    const params = new URLSearchParams({ from, to })
    if (payment !== 'all') params.set('payment', payment)
    const res = await fetch(`/api/owner/reports?${params}`)
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
        <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-[var(--text-dim)] text-sm mt-0.5">Choose a date range to generate a full financial report</p>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-8 space-y-4">
        {/* Date range */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              max={to} className="input" />
          </div>
          <div className="flex-1">
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              min={from} max={lagosToday()} className="input" />
          </div>
          <button onClick={run} disabled={loading || !from || !to}
            className="sm:w-auto w-full bg-[var(--text)] text-[var(--bg)] font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-[var(--text-muted)] disabled:opacity-40 active:scale-[0.98] transition-all whitespace-nowrap">
            {loading ? 'Generating…' : 'Run Report'}
          </button>
        </div>

        {/* Payment method filter */}
        <div>
          <p className="text-[var(--text-muted)] text-xs font-medium mb-2">Payment Method</p>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'cash', 'transfer', 'pos'] as const).map(opt => (
              <button key={opt} type="button"
                onClick={() => setPayment(opt)}
                className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  payment === opt
                    ? 'bg-[var(--text)] border-[var(--text)] text-[var(--bg)]'
                    : 'bg-[var(--elevated)] border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-faint)]'
                }`}>
                {opt === 'all' ? 'All Methods' : opt === 'pos' ? 'POS' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
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
            {[0,1,2,3,4].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-20 animate-pulse" />)}
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-48 animate-pulse" />
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-48 animate-pulse" />
        </div>
      )}

      {/* Results */}
      {!loading && ran && data && (
        <>
          {/* Summary cards */}
          <section className="mb-8">
            <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-4">
              Summary · {fmtDate(from)} – {fmtDate(to)}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <SummaryCard label="Service Revenue"  value={fmtNaira(data.summary.totalRevenue)}    />
              <SummaryCard label="Your Earnings"    value={fmtNaira(data.summary.ownerProfit)}     accent="gold" />
              <SummaryCard label="Commission"       value={fmtNaira(data.summary.totalCommission)} accent="amber" />
              <SummaryCard label="Tips Collected"   value={fmtNaira(data.summary.totalTips)}       accent="emerald" />
              <SummaryCard label="Total Staff Payout" value={fmtNaira(data.summary.totalPayout)}   accent="gold" />
              <SummaryCard label={`Visits · ${data.summary.totalServices} services`} value={String(data.summary.totalVisits)} />
            </div>
          </section>

          {/* Payment method breakdown */}
          {payment === 'all' && (
            <section className="mb-8">
              <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-4">By Payment Method</h2>
              <div className="grid grid-cols-3 gap-4">
                {([
                  { key: 'cash',     label: 'Cash' },
                  { key: 'transfer', label: 'Transfer' },
                  { key: 'pos',      label: 'POS' },
                ] as const).map(({ key, label }) => {
                  const amount = data!.byPayment[key]
                  const pct = data!.summary.totalRevenue > 0
                    ? Math.round((amount / data!.summary.totalRevenue) * 100)
                    : 0
                  return (
                    <div key={key} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                      <p className="text-[var(--text-dim)] text-xs font-medium mb-2">{label}</p>
                      <p className={`text-lg font-bold tabular-nums ${amount > 0 ? 'text-[var(--text)]' : 'text-[var(--text-faint)]'}`}>
                        {amount > 0 ? fmtNaira(amount) : '—'}
                      </p>
                      {amount > 0 && (
                        <p className="text-[var(--text-faint)] text-xs mt-1">{pct}% of total</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Two columns: by service + by staff */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

            {/* By service */}
            <section>
              <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-4">Revenue by Service</h2>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
                {data.byService.length === 0
                  ? <EmptyRow text="No services in this period." />
                  : data.byService.map(s => (
                  <div key={s.name} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[var(--text)] text-sm font-medium">{s.name}</p>
                      <p className="text-[var(--text)] text-sm font-semibold tabular-nums">{fmtNaira(s.revenue)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[var(--border)] rounded-full h-1">
                        <div className="bg-[var(--text)]/30 h-1 rounded-full"
                          style={{ width: `${Math.round((s.revenue / maxServiceRev) * 100)}%` }} />
                      </div>
                      <span className="text-[var(--text-dim)] text-xs">{s.count}×</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* By staff */}
            <section>
              <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-4">Revenue by Staff</h2>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
                {data.byStaff.length === 0
                  ? <EmptyRow text="No staff data in this period." />
                  : data.byStaff.map(s => (
                  <div key={s.name} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--border)] border border-[var(--border-strong)] flex items-center justify-center flex-shrink-0">
                          <span className="text-[var(--text)] text-[10px] font-semibold">{s.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <p className="text-[var(--text)] text-sm font-medium">{s.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[var(--text)] text-sm font-semibold tabular-nums">{fmtNaira(s.revenue)}</p>
                        <p className="text-[10px] text-[var(--text-muted)] tabular-nums">
                          <span className="text-amber-400">{fmtNaira(s.commission)}</span>
                          {s.tips > 0 && <> + <span className="text-emerald-400">{fmtNaira(s.tips)}</span> tip</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[var(--border)] rounded-full h-1">
                        <div className="bg-[var(--text)]/30 h-1 rounded-full"
                          style={{ width: `${Math.round((s.revenue / maxStaffRev) * 100)}%` }} />
                      </div>
                      <span className="text-[var(--text-dim)] text-xs">{s.services} svcs</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Visit log */}
          {data.visits.length > 0 && (
            <section>
              <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-4">
                Visit Log <span className="normal-case text-[var(--text-faint)]">(up to 50 most recent)</span>
              </h2>

              {/* Desktop */}
              <div className="hidden lg:block bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Date</th>
                      <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Client</th>
                      <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Staff</th>
                      <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Payment</th>
                      <th className="text-right text-[var(--text-dim)] text-xs font-medium px-5 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {data.visits.map(v => (
                      <tr key={v.id} className="hover:bg-[var(--elevated)] transition-colors">
                        <td className="px-5 py-3 text-[var(--text-muted)]">{fmtDate(v.visit_date)}</td>
                        <td className="px-5 py-3">
                          <p className="text-[var(--text)] font-medium">{mask.name(v.clients?.name)}</p>
                          <p className="text-[var(--text-dim)] text-xs">{mask.phone(v.clients?.phone)}</p>
                        </td>
                        <td className="px-5 py-3 text-[var(--text-muted)]">{v.users?.name ?? '—'}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-[var(--border-strong)] text-[var(--text-muted)]">
                            {v.payment_method === 'pos' ? 'POS' : v.payment_method.charAt(0).toUpperCase() + v.payment_method.slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-[var(--text)] font-semibold tabular-nums">
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
                  <div key={v.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[var(--text)] text-sm font-medium">{mask.name(v.clients?.name)}</p>
                        <p className="text-[var(--text-dim)] text-xs">{v.users?.name} · {fmtDate(v.visit_date)}</p>
                      </div>
                      <p className="text-[var(--text)] text-sm font-bold tabular-nums">{fmtNaira(v.total_ngn)}</p>
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
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-16 text-center">
          <p className="text-[var(--text-faint)] text-sm">Select a date range above and tap Run Report.</p>
          <p className="text-[var(--text-faint)] text-xs mt-1">Default range is this month.</p>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: 'gold' | 'amber' | 'emerald' }) {
  return (
    <div className={`bg-[var(--card)] rounded-xl p-4 border ${
      accent === 'gold'    ? 'border-[var(--accent)]/30'     :
      accent === 'amber'   ? 'border-amber-500/20'    :
      accent === 'emerald' ? 'border-emerald-500/20'  :
      'border-[var(--border)]'
    }`}>
      <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${
        accent === 'gold'    ? 'text-[var(--accent)]'   :
        accent === 'amber'   ? 'text-amber-400'   :
        accent === 'emerald' ? 'text-emerald-400' :
        'text-[var(--text)]'
      }`}>{value}</p>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-5 py-8 text-center text-[var(--text-faint)] text-sm">{text}</div>
}
