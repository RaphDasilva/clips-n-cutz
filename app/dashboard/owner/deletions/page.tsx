'use client'

import { useCallback, useEffect, useState } from 'react'
import { useClientMask } from '@/lib/demo-mode'

interface DeletionEntry {
  id:             string
  original_visit_id: string
  client_name:    string | null
  client_phone:   string | null
  staff_name:     string | null
  visit_date:     string
  total_ngn:      number
  tip_ngn:        number
  payment_method: string | null
  service_names:  string[]
  reason:         string | null
  reason_note:    string | null
  deleted_at:     string
  acknowledged_at: string | null
  users:          { name: string } | null
}

const REASON_LABEL: Record<string, string> = {
  duplicate:    'Duplicate entry',
  wrong_client: 'Wrong client',
  wrong_amount: 'Wrong amount',
  other:        'Other',
}

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos',
  })
}

export default function DeletionsPage() {
  const mask = useClientMask()
  const [filter, setFilter]       = useState<'all' | 'unack'>('all')
  const [items, setItems]         = useState<DeletionEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [acking, setAcking]       = useState<string | null>(null)

  const load = useCallback(async (mode: 'all' | 'unack') => {
    setLoading(true)
    const res = await fetch(`/api/owner/deletions${mode === 'unack' ? '?unack=true' : ''}&limit=200`)
    if (res.ok) {
      const j = await res.json() as { deletions: DeletionEntry[] }
      setItems(j.deletions ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(filter) }, [load, filter])

  async function toggleAck(d: DeletionEntry) {
    setAcking(d.id)
    try {
      await fetch(`/api/owner/deletions/${d.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ acknowledged: !d.acknowledged_at }),
      })
      await load(filter)
    } finally {
      setAcking(null)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Deletion Audit</h1>
          <p className="text-[var(--text-dim)] text-sm mt-1">Every walk-in the manager has removed, with reason.</p>
        </div>
        <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1">
          {(['all', 'unack'] as const).map(opt => (
            <button key={opt} onClick={() => setFilter(opt)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filter === opt
                  ? 'bg-[var(--text)] text-[var(--bg)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elevated)]'
              }`}>
              {opt === 'all' ? 'All' : 'Unacknowledged'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-24 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-6 py-16 text-center">
          <p className="text-[var(--text-faint)] text-sm">
            {filter === 'unack' ? 'Nothing waiting for your review.' : 'No deletions recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(d => {
            const isAck = Boolean(d.acknowledged_at)
            return (
              <div key={d.id} className={`bg-[var(--card)] border rounded-2xl p-5 ${
                isAck ? 'border-[var(--border)]' : 'border-amber-500/40'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-[var(--text)] text-base font-semibold">
                      {mask.name(d.client_name, 'Unknown client')}
                      {mask.phone(d.client_phone) && <span className="text-[var(--text-dim)] text-xs font-normal ml-2">{mask.phone(d.client_phone)}</span>}
                    </p>
                    <p className="text-[var(--text-dim)] text-xs mt-1">
                      {d.users?.name ?? 'Manager'} removed at {fmtDateTime(d.deleted_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[var(--text)] text-lg font-bold tabular-nums">{fmtNaira(d.total_ngn)}</span>
                    {!isAck && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-500">
                        New
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                  <div>
                    <p className="text-[var(--text-dim)] text-[10px] uppercase tracking-wider mb-0.5">Reason</p>
                    <p className="text-[var(--text)] font-medium">{REASON_LABEL[d.reason ?? ''] ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-dim)] text-[10px] uppercase tracking-wider mb-0.5">Staff</p>
                    <p className="text-[var(--text)] font-medium truncate">{d.staff_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-dim)] text-[10px] uppercase tracking-wider mb-0.5">Visit date</p>
                    <p className="text-[var(--text)] font-medium">
                      {new Date(d.visit_date + 'T12:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--text-dim)] text-[10px] uppercase tracking-wider mb-0.5">Payment</p>
                    <p className="text-[var(--text)] font-medium capitalize">{d.payment_method ?? '—'}</p>
                  </div>
                </div>

                {d.service_names.length > 0 && (
                  <p className="text-[var(--text-muted)] text-xs mb-3">
                    <span className="text-[var(--text-dim)]">Services: </span>
                    {d.service_names.join(', ')}
                  </p>
                )}

                {d.reason_note && (
                  <p className="text-[var(--text-muted)] text-xs italic bg-[var(--elevated)] border border-[var(--border)] rounded-lg px-3 py-2 mb-3">
                    &ldquo;{d.reason_note}&rdquo;
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
                  <p className="text-[var(--text-faint)] text-[10px]">
                    {isAck && d.acknowledged_at && `Dismissed ${fmtDateTime(d.acknowledged_at)}`}
                  </p>
                  <button onClick={() => toggleAck(d)} disabled={acking === d.id}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 ${
                      isAck
                        ? 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elevated)]'
                        : 'text-amber-500 hover:bg-amber-500/10'
                    }`}>
                    {acking === d.id ? '…' : (isAck ? 'Mark as new' : 'Dismiss')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
