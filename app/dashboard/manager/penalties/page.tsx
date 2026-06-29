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
interface Staff    { id: string; name: string; is_active: boolean }

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }
function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_PILL: Record<string, string> = {
  active:   'bg-red-500/10 text-red-400 border-red-500/30',
  reversed: 'bg-[var(--border)] text-[var(--text-muted)] border-[var(--border-strong)]',
}

const PRESET_REASONS = [
  'Late opening',
  'Phone use during work',
  'Rude to client',
  'Damaged equipment',
  'Missed instruction',
  'Other',
]

export default function ManagerPenaltiesPage() {
  const mask = useClientMask()
  const [data, setData]       = useState<ListResp | null>(null)
  const [staff, setStaff]     = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)

  const [pStaffId, setPStaffId]   = useState('')
  const [pAmount, setPAmount]     = useState('')
  const [pReason, setPReason]     = useState('')
  const [issuing, setIssuing]     = useState(false)
  const [issueError, setIssueErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [pRes, sRes] = await Promise.all([
      fetch('/api/manager/penalties'),
      fetch('/api/manager/staff'),
    ])
    if (pRes.ok) setData(await pRes.json())
    if (sRes.ok) {
      const j = await sRes.json()
      setStaff((j.staff ?? []).filter((s: Staff) => s.is_active))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault()
    setIssueErr('')
    const amt = parseInt(pAmount, 10) || 0
    if (!pStaffId || amt <= 0 || !pReason.trim()) {
      setIssueErr('Pick a staff, enter an amount above ₦0, and write a reason.')
      return
    }
    setIssuing(true)
    try {
      const res = await fetch('/api/manager/penalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: pStaffId, amountNgn: amt, reason: pReason.trim() }),
      })
      const j = await res.json()
      if (!res.ok) { setIssueErr(j.error ?? 'Failed to record penalty.'); return }
      setPStaffId(''); setPAmount(''); setPReason('')
      load()
    } catch {
      setIssueErr('Connection error. Try again.')
    } finally {
      setIssuing(false)
    }
  }

  async function reverse(id: string) {
    if (!confirm('Reverse this penalty? It will stop being deducted from the staff\'s payout.')) return
    const res = await fetch(`/api/manager/penalties/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reverse' }),
    })
    if (res.ok) load()
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      <div className="mb-6">
        <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Penalties</h1>
        <p className="text-[var(--text-dim)] text-sm mt-0.5">
          Penalties for non-attendance issues (phone use, late opening, damaged equipment, etc.). Active penalties auto-deduct from the staff&rsquo;s next weekly payout.
        </p>
      </div>

      {/* Issue form */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-4">Issue a Penalty</h2>
        <form onSubmit={handleIssue} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-1">
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Staff</label>
            <select value={pStaffId} onChange={e => setPStaffId(e.target.value)} required className="input">
              <option value="">Pick staff…</option>
              {staff.map(s => <option key={s.id} value={s.id}>{mask.name(s.name)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Amount (₦)</label>
            <input type="text" inputMode="numeric"
              value={pAmount}
              onChange={e => setPAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="2000" required className="input tabular-nums" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Reason</label>
            <input type="text"
              value={pReason}
              onChange={e => setPReason(e.target.value)}
              list="penalty-reasons"
              placeholder="e.g. Late opening"
              maxLength={140}
              required
              className="input" />
            <datalist id="penalty-reasons">
              {PRESET_REASONS.map(r => <option key={r} value={r} />)}
            </datalist>
          </div>
          <div className="sm:col-span-4 flex items-center justify-between gap-3">
            {issueError ? <p className="text-red-400 text-xs">{issueError}</p> : <span />}
            <button type="submit" disabled={issuing}
              className="bg-[var(--text)] text-[var(--bg)] font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] transition-all">
              {issuing ? 'Saving…' : 'Record Penalty'}
            </button>
          </div>
        </form>
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
                {p.status === 'active' && (
                  <button onClick={() => reverse(p.id)}
                    className="text-[var(--text-muted)] hover:text-emerald-400 text-xs flex-shrink-0">
                    Reverse
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
