'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface PeriodStats { revenue: number; visits: number }
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
    <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 h-full hover:border-[#2a2a2a] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[#666] text-xs font-medium uppercase tracking-wider">{label}</p>
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
      <p className="text-white text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-[#555] text-xs mt-1.5">{sub}</p>}
    </div>
  )
  return href ? <Link href={href} className="block">{inner}</Link> : inner
}

export default function OwnerHome() {
  const router = useRouter()
  const [name, setName]       = useState('')
  const [data, setData]       = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const s = getSession()
    if (!s) { router.replace('/login'); return }
    setName(s.name.split(' ')[0])
    const res = await fetch('/api/owner/summary')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

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
        <p className="text-[#555] text-sm mb-1">{today}</p>
        <h1 className="text-white text-2xl font-bold tracking-tight">
          Good {greeting()}, {name}
        </h1>
        <p className="text-[#555] text-sm mt-1">Financial overview — read only</p>
      </div>

      {/* Today vs Yesterday */}
      <section className="mb-8">
        <h2 className="text-[#555] text-xs font-semibold uppercase tracking-wider mb-4">Today</h2>
        {loading ? <SkeletonGrid n={2} /> : (
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        )}
      </section>

      {/* This week / This month */}
      <section className="mb-8">
        <h2 className="text-[#555] text-xs font-semibold uppercase tracking-wider mb-4">Periods</h2>
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
        <h2 className="text-[#555] text-xs font-semibold uppercase tracking-wider mb-4">
          This Month — Profit Split
        </h2>
        {loading ? <SkeletonGrid n={3} /> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
              <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-3">Total Revenue</p>
              <p className="text-white text-2xl font-bold tabular-nums">{fmtNairaFull(data!.month.revenue)}</p>
              <p className="text-[#555] text-xs mt-1.5">All services this month</p>
            </div>
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
              <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-3">Staff Commission <span className="text-[#444] normal-case">(30%)</span></p>
              <p className="text-amber-400 text-2xl font-bold tabular-nums">{fmtNairaFull(commissionOwed)}</p>
              <p className="text-[#555] text-xs mt-1.5">Owed to all staff</p>
              <Link href="/dashboard/owner/commission"
                className="text-[#555] text-xs mt-3 inline-flex items-center gap-1 hover:text-white transition-colors">
                See breakdown →
              </Link>
            </div>
            <div className="bg-[#141414] border border-emerald-500/20 rounded-xl p-5">
              <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-3">Your Earnings <span className="text-[#444] normal-case">(70%)</span></p>
              <p className="text-emerald-400 text-2xl font-bold tabular-nums">{fmtNairaFull(ownerCut)}</p>
              <p className="text-[#555] text-xs mt-1.5">After staff commission</p>
            </div>
          </div>
        )}
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/dashboard/owner/commission"
          className="flex items-center justify-between bg-[#141414] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl px-5 py-4 transition-colors group">
          <div>
            <p className="text-white text-sm font-semibold">Commission Breakdown</p>
            <p className="text-[#555] text-xs mt-0.5">See what each staff member earned</p>
          </div>
          <svg className="w-4 h-4 text-[#444] group-hover:text-[#888] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        <Link href="/dashboard/owner/reports"
          className="flex items-center justify-between bg-[#141414] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl px-5 py-4 transition-colors group">
          <div>
            <p className="text-white text-sm font-semibold">Custom Reports</p>
            <p className="text-[#555] text-xs mt-0.5">Revenue and visits for any date range</p>
          </div>
          <svg className="w-4 h-4 text-[#444] group-hover:text-[#888] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        <div key={i} className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-24 animate-pulse" />
      ))}
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
