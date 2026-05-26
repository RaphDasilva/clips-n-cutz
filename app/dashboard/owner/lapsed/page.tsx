'use client'

import { useCallback, useEffect, useState } from 'react'
import { useClientMask } from '@/lib/demo-mode'

interface Lapsed {
  id: string
  name: string
  phone: string | null
  last_visit: string
}

function daysAgo(dateStr: string) {
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) + 'T12:00:00')
  const then  = new Date(dateStr + 'T12:00:00')
  return Math.floor((today.getTime() - then.getTime()) / 86400000)
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LapsedClientsPage() {
  const mask = useClientMask()
  const [items, setItems]     = useState<Lapsed[]>([])
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState(30)

  const load = useCallback(async (days: number) => {
    setLoading(true)
    const res = await fetch(`/api/owner/lapsed-clients?days=${days}`)
    if (res.ok) {
      const j = await res.json()
      setItems(j.lapsed ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(threshold) }, [load, threshold])

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Lapsed Clients</h1>
          <p className="text-[var(--text-dim)] text-sm mt-1">
            Clients who haven&rsquo;t visited recently. A re-engagement message is sent automatically
            every morning to anyone past the 30-day mark.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1">
          {[30, 60, 90].map(n => (
            <button key={n} onClick={() => setThreshold(n)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                threshold === n
                  ? 'bg-[var(--text)] text-[var(--bg)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elevated)]'
              }`}>
              {n}+ days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-16 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-6 py-16 text-center">
          <p className="text-emerald-400 text-sm font-semibold">Nothing to chase 🎉</p>
          <p className="text-[var(--text-dim)] text-xs mt-1">No clients have lapsed beyond {threshold} days.</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
          {items.map(c => (
            <div key={c.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--text)] font-medium truncate">{mask.name(c.name)}</p>
                <p className="text-[var(--text-dim)] text-xs mt-0.5">
                  Last visit {fmtDate(c.last_visit)}{mask.phone(c.phone) && <> · {mask.phone(c.phone)}</>}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[var(--accent)] text-sm font-bold tabular-nums">{daysAgo(c.last_visit)} days</p>
                <p className="text-[var(--text-faint)] text-[10px] uppercase tracking-wider">ago</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
