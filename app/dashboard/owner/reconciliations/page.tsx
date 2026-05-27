'use client'

import { useCallback, useEffect, useState } from 'react'
import { useClientMask } from '@/lib/demo-mode'

interface ReconEntry {
  id: string
  date: string
  expected_ngn: number
  actual_ngn: number
  variance_ngn: number
  notes: string | null
  recorded_at: string
  users: { name: string } | null
}

function fmtNaira(n: number) {
  const sign = n < 0 ? '-' : (n > 0 ? '+' : '')
  return `${sign}₦${Math.abs(n).toLocaleString('en-NG')}`
}

function fmtDay(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

export default function ReconciliationsPage() {
  const mask = useClientMask()
  const [items, setItems]               = useState<ReconEntry[]>([])
  const [totalVariance, setTotalVariance] = useState(0)
  const [shortDays, setShortDays]       = useState(0)
  const [loading, setLoading]           = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/owner/reconciliations?limit=60')
    if (res.ok) {
      const j = await res.json()
      setItems(j.items ?? [])
      setTotalVariance(j.totalVariance ?? 0)
      setShortDays(j.shortDays ?? 0)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      <div className="mb-6">
        <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Cash Reconciliations</h1>
        <p className="text-[var(--text-dim)] text-sm mt-1">Daily drawer counts vs expected. Last 60 days.</p>
      </div>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-[var(--text-dim)] text-[10px] font-bold uppercase tracking-wider mb-1">Days closed</p>
            <p className="text-[var(--text)] text-xl font-bold tabular-nums">{items.length}</p>
          </div>
          <div className="bg-[var(--card)] border border-red-500/20 rounded-xl p-4">
            <p className="text-[var(--text-dim)] text-[10px] font-bold uppercase tracking-wider mb-1">Short days</p>
            <p className="text-red-400 text-xl font-bold tabular-nums">{shortDays}</p>
          </div>
          <div className={`bg-[var(--card)] border rounded-xl p-4 ${
            totalVariance === 0 ? 'border-emerald-500/20'
            : totalVariance < 0 ? 'border-red-500/20'
            : 'border-amber-500/20'
          }`}>
            <p className="text-[var(--text-dim)] text-[10px] font-bold uppercase tracking-wider mb-1">Net variance</p>
            <p className={`text-xl font-bold tabular-nums ${
              totalVariance === 0 ? 'text-emerald-400'
              : totalVariance < 0 ? 'text-red-400'
              : 'text-amber-400'
            }`}>{fmtNaira(totalVariance)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-16 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-6 py-16 text-center">
          <p className="text-[var(--text-faint)] text-sm">No days closed yet.</p>
          <p className="text-[var(--text-dim)] text-xs mt-1">The manager will close out the cash drawer at end of day.</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
          {items.map(r => (
            <div key={r.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--text)] text-sm font-semibold">{fmtDay(r.date)}</p>
                <p className="text-[var(--text-dim)] text-xs mt-0.5">
                  Expected ₦{r.expected_ngn.toLocaleString('en-NG')} · Counted ₦{r.actual_ngn.toLocaleString('en-NG')}
                  {r.users?.name && <> · by {mask.name(r.users.name)}</>}
                </p>
                {r.notes && <p className="text-[var(--text-muted)] text-[11px] mt-1 italic">&ldquo;{r.notes}&rdquo;</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-base font-bold tabular-nums ${
                  r.variance_ngn === 0 ? 'text-emerald-400'
                  : r.variance_ngn < 0 ? 'text-red-400'
                  : 'text-amber-400'
                }`}>{fmtNaira(r.variance_ngn)}</p>
                <p className="text-[var(--text-faint)] text-[10px] uppercase tracking-wider">
                  {r.variance_ngn === 0 ? 'Match' : r.variance_ngn < 0 ? 'Short' : 'Over'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
