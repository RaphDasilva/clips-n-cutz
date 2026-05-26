'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import RevenueChart from '@/components/RevenueChart'
import { useClientMask } from '@/lib/demo-mode'

interface PaymentBreakdown { cash: number; transfer: number; pos: number }
interface PeriodStats { revenue: number; tips: number; visits: number; byPayment: PaymentBreakdown }
interface Summary {
  today: PeriodStats
  yesterday: PeriodStats
  week: PeriodStats
  month: PeriodStats
}

function fmtNaira(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(1)}K`
  return `₦${n.toLocaleString('en-NG')}`
}

function fmtNairaFull(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

function delta(current: number, previous: number) {
  if (previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  return { pct: Math.abs(Math.round(pct)), up: pct >= 0 }
}

function StatCard({
  label, value, sub, delta: d, href,
}: {
  label: string
  value: string
  sub?: string
  delta?: { pct: number; up: boolean } | null
  href?: string
}) {
  const inner = (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 h-full hover:border-[var(--border-strong)] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider">{label}</p>
        {d && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
            d.up
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {d.up ? '↑' : '↓'} {d.pct}%
          </span>
        )}
      </div>
      <p className="text-[var(--text)] text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-[var(--text-dim)] text-xs mt-1.5">{sub}</p>}
    </div>
  )
  return href ? <Link href={href} className="block">{inner}</Link> : inner
}

interface DeletionEntry {
  id:             string
  client_name:    string | null
  staff_name:     string | null
  total_ngn:      number
  service_names:  string[]
  reason:         string | null
  reason_note:    string | null
  deleted_at:     string
  users:          { name: string } | null
}

const REASON_LABEL: Record<string, string> = {
  duplicate:    'Duplicate entry',
  wrong_client: 'Wrong client',
  wrong_amount: 'Wrong amount',
  other:        'Other',
}

export default function OwnerHome() {
  const router = useRouter()
  const mask = useClientMask()
  const [name, setName]                 = useState('')
  const [data, setData]                 = useState<Summary | null>(null)
  const [loading, setLoading]           = useState(true)
  const [unackDeletions, setUnackDeletions] = useState<DeletionEntry[]>([])
  const [acking, setAcking]             = useState<string | null>(null)
  const [lapsedCount, setLapsedCount]   = useState(0)

  const load = useCallback(async () => {
    const s = getSession()
    if (!s) { router.replace('/login'); return }
    setName(s.name.split(' ')[0])
    const [summaryRes, delRes, lapsedRes] = await Promise.all([
      fetch('/api/owner/summary'),
      fetch('/api/owner/deletions?unack=true&limit=10'),
      fetch('/api/owner/lapsed-clients'),
    ])
    if (summaryRes.ok) setData(await summaryRes.json())
    if (delRes.ok) {
      const j = await delRes.json() as { deletions: DeletionEntry[] }
      setUnackDeletions(j.deletions ?? [])
    }
    if (lapsedRes.ok) {
      const j = await lapsedRes.json() as { lapsed: { id: string }[] }
      setLapsedCount(j.lapsed?.length ?? 0)
    }
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function acknowledgeDeletion(id: string) {
    setAcking(id)
    try {
      await fetch(`/api/owner/deletions/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ acknowledged: true }),
      })
      setUnackDeletions(prev => prev.filter(d => d.id !== id))
    } finally {
      setAcking(null)
    }
  }

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos',
  })

  const todayDelta     = data ? delta(data.today.revenue,  data.yesterday.revenue) : null
  const ownerCut       = data ? Math.round(data.month.revenue * 0.70) : 0
  const commissionOwed = data ? Math.round(data.month.revenue * 0.30) : 0

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[var(--text-dim)] text-sm mb-1">{today}</p>
        <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">
          Good {greeting()}, {name}
        </h1>
        <p className="text-[var(--text-dim)] text-sm mt-1">Financial overview — read only</p>
      </div>

      {/* Lapsed clients quick stat */}
      {lapsedCount > 0 && (
        <Link href="/dashboard/owner/lapsed"
          className="block mb-6 bg-[var(--card)] border border-[var(--accent)]/30 rounded-2xl px-5 py-4 hover:bg-[var(--elevated)] transition-all group">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[var(--text)] font-semibold">
                  {lapsedCount} client{lapsedCount === 1 ? '' : 's'} haven&rsquo;t visited in 30+ days
                </p>
                <p className="text-[var(--text-dim)] text-xs mt-0.5">
                  A re-engagement message goes out automatically every morning. Tap to see the list.
                </p>
              </div>
            </div>
            <svg className="w-4 h-4 text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Link>
      )}

      {/* Deletion audit banner */}
      {unackDeletions.length > 0 && (
        <section className="mb-8">
          <div className="bg-amber-500/5 border-2 border-amber-500/40 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.732 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <h2 className="text-amber-500 text-sm font-bold">
                  Manager removed {unackDeletions.length} visit{unackDeletions.length === 1 ? '' : 's'}
                </h2>
              </div>
              <Link href="/dashboard/owner/deletions" className="text-amber-500 text-xs font-semibold hover:underline">
                See all →
              </Link>
            </div>
            <div className="divide-y divide-amber-500/20">
              {unackDeletions.slice(0, 5).map(d => (
                <div key={d.id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[var(--text)] text-sm font-medium truncate">
                      {mask.name(d.client_name, 'Unknown client')}
                      <span className="text-[var(--text-muted)] font-normal"> &middot; {fmtNairaFull(d.total_ngn)}</span>
                    </p>
                    <p className="text-[var(--text-dim)] text-[11px] mt-0.5">
                      {d.users?.name ?? 'Manager'} &middot; {new Date(d.deleted_at).toLocaleString('en-NG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })}
                      {' · '}{REASON_LABEL[d.reason ?? ''] ?? 'No reason'}
                    </p>
                    {d.reason_note && (
                      <p className="text-[var(--text-muted)] text-[11px] mt-1 italic">&ldquo;{d.reason_note}&rdquo;</p>
                    )}
                    {d.service_names.length > 0 && (
                      <p className="text-[var(--text-muted)] text-[11px] mt-1">
                        {d.service_names.join(', ')} · by {d.staff_name ?? '—'}
                      </p>
                    )}
                  </div>
                  <button onClick={() => acknowledgeDeletion(d.id)} disabled={acking === d.id}
                    className="flex-shrink-0 text-amber-500 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-all disabled:opacity-40">
                    {acking === d.id ? '…' : 'Dismiss'}
                  </button>
                </div>
              ))}
            </div>
            {unackDeletions.length > 5 && (
              <div className="px-5 py-2 text-center border-t border-amber-500/20">
                <Link href="/dashboard/owner/deletions" className="text-amber-500 text-xs font-medium hover:underline">
                  {unackDeletions.length - 5} more
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Today vs Yesterday */}
      <section className="mb-8">
        <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-4">Today</h2>
        {loading ? <SkeletonGrid n={3} /> : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Revenue"
              value={fmtNaira(data!.today.revenue)}
              sub={`Yesterday: ${fmtNaira(data!.yesterday.revenue)}`}
              delta={todayDelta}
            />
            <StatCard
              label="Visits"
              value={String(data!.today.visits)}
              sub={`Yesterday: ${data!.yesterday.visits}`}
            />
            <StatCard
              label="Tips collected"
              value={fmtNaira(data!.today.tips)}
              sub={`Yesterday: ${fmtNaira(data!.yesterday.tips)}`}
            />
          </div>
        )}
      </section>

      {/* Revenue chart */}
      <RevenueChart />

      {/* Payment method breakdown — today */}
      <section className="mb-8">
        <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-4">Today — Payment Methods</h2>
        {loading ? <SkeletonGrid n={3} /> : (
          <div className="grid grid-cols-3 gap-4">
            <PaymentCard label="Cash"     amount={data!.today.byPayment.cash}     />
            <PaymentCard label="Transfer" amount={data!.today.byPayment.transfer} />
            <PaymentCard label="POS"      amount={data!.today.byPayment.pos}      />
          </div>
        )}
      </section>

      {/* This week / This month */}
      <section className="mb-8">
        <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-4">Periods</h2>
        {loading ? <SkeletonGrid n={4} /> : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="This week" value={fmtNaira(data!.week.revenue)} sub={`${data!.week.visits} visits`} />
            <StatCard label="Week visits" value={String(data!.week.visits)} />
            <StatCard label="This month" value={fmtNaira(data!.month.revenue)} sub={`${data!.month.visits} visits`} />
            <StatCard label="Month visits" value={String(data!.month.visits)} />
          </div>
        )}
      </section>

      {/* Month profit split */}
      <section className="mb-8">
        <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-4">
          This Month — Profit Split
        </h2>
        {loading ? <SkeletonGrid n={3} /> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-3">Total Revenue</p>
              <p className="text-[var(--text)] text-2xl font-bold tabular-nums">{fmtNairaFull(data!.month.revenue)}</p>
              <p className="text-[var(--text-dim)] text-xs mt-1.5">All services this month</p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-3">Staff Payout</p>
              <p className="text-amber-400 text-2xl font-bold tabular-nums">{fmtNairaFull(commissionOwed + data!.month.tips)}</p>
              <p className="text-[var(--text-dim)] text-xs mt-1.5">
                Commission {fmtNairaFull(commissionOwed)} + Tips {fmtNairaFull(data!.month.tips)}
              </p>
              <Link href="/dashboard/owner/commission"
                className="text-[var(--text-dim)] text-xs mt-3 inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors">
                See breakdown →
              </Link>
            </div>
            <div className="bg-[var(--card)] border border-[var(--accent)]/30 rounded-xl p-5">
              <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mb-3">Your Earnings <span className="text-[var(--text-faint)] normal-case">(70%)</span></p>
              <p className="text-[var(--accent)] text-2xl font-bold tabular-nums">{fmtNairaFull(ownerCut)}</p>
              <p className="text-[var(--text-dim)] text-xs mt-1.5">After staff commission</p>
            </div>
          </div>
        )}
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/dashboard/owner/commission"
          className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl px-5 py-4 transition-colors group">
          <div>
            <p className="text-[var(--text)] text-sm font-semibold">Commission Breakdown</p>
            <p className="text-[var(--text-dim)] text-xs mt-0.5">See what each staff member earned</p>
          </div>
          <svg className="w-4 h-4 text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        <Link href="/dashboard/owner/reports"
          className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl px-5 py-4 transition-colors group">
          <div>
            <p className="text-[var(--text)] text-sm font-semibold">Custom Reports</p>
            <p className="text-[var(--text-dim)] text-xs mt-0.5">Revenue and visits for any date range</p>
          </div>
          <svg className="w-4 h-4 text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

function SkeletonGrid({ n }: { n: number }) {
  return (
    <div className={`grid grid-cols-2 ${n === 4 ? 'lg:grid-cols-4' : n === 3 ? 'lg:grid-cols-3' : ''} gap-4`}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-24 animate-pulse" />
      ))}
    </div>
  )
}

function PaymentCard({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <p className="text-[var(--text-dim)] text-xs font-medium mb-2">{label}</p>
      <p className={`text-base font-bold tabular-nums ${amount > 0 ? 'text-[var(--text)]' : 'text-[var(--text-faint)]'}`}>
        {amount > 0 ? fmtNairaFull(amount) : '—'}
      </p>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
