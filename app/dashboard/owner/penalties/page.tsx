'use client'

import { useCallback, useEffect, useState } from 'react'
import { useClientMask } from '@/lib/demo-mode'

interface ActiveRow { staffId: string; staffName: string; activeTotal: number }
interface Penalty {
  id:          string
  staff_id:    string
  amount_ngn:  number
  reason:      string
  given_at:    string
  status:      'active' | 'reversed'
  reversed_at: string | null
  users:       { name: string } | null
}
interface ListResp { penalties: Penalty[]; activeByStaff: ActiveRow[] }

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }
function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_PILL: Record<string, string> = {
  active:   'bg-red-500/10 text-red-400 border-red-500/30',
  reversed: 'bg-[var(--border)] text-[var(--text-muted)] border-[var(--border-strong)]',
}

// Owner is read-only. Manager issues and reverses via
// /dashboard/manager/penalties. This page is for audit only.
export default function OwnerPenaltiesPage() {
  const mask = useClientMask()
  const [data, setData]       = useState<ListResp | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/owner/penalties')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      <div className="mb-6">
        <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Penalties</h1>
        <p className="text-[var(--text-dim)] text-sm mt-0.5">
          Read-only view. The manager issues and reverses penalties for non-attendance issues; the system deducts active amounts from each weekly payout.
        </p>
      </div>

      {/* Active rollup */}
      <div className="mb-8">
        <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-3">Active This Week</h2>
        {loading ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-24 animate-pulse" />
        ) : (data?.activeByStaff.length ?? 0) === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-6 text-center">
            <p className="text-emerald-400 text-sm font-medium">No active penalties 🎉</p>
            <p className="text-[var(--text-faint)] text-xs mt-1">Nothing to deduct from the next payout.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data!.activeByStaff.map(o => (
              <div key={o.staffId} className="bg-[var(--card)] border border-red-500/20 rounded-xl px-4 py-3.5">
                <p className="text-[var(--text)] text-sm font-medium truncate">{mask.name(o.staffName)}</p>
                <p className="text-red-400 text-xl font-bold tabular-nums mt-1">-{fmtNaira(o.activeTotal)}</p>
                <p className="text-[var(--text-faint)] text-[10px] mt-0.5">Will be deducted next Sunday</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-3">All Penalties</h2>
        {loading ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-48 animate-pulse" />
        ) : (data?.penalties.length ?? 0) === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-10 text-center">
            <p className="text-[var(--text-faint)] text-sm">No penalties recorded yet.</p>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
            {data!.penalties.map(p => (
              <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[var(--text)] text-sm font-medium truncate">{mask.name(p.users?.name)}</p>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_PILL[p.status]}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[var(--text-dim)] text-xs mt-0.5">
                    {fmtDate(p.given_at)} · {p.reason}
                  </p>
                </div>
                <p className={`text-sm font-semibold tabular-nums flex-shrink-0 ${p.status === 'active' ? 'text-red-400' : 'text-[var(--text-faint)] line-through'}`}>
                  -{fmtNaira(p.amount_ngn)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
