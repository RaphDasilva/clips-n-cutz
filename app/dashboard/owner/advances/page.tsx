'use client'

import { useCallback, useEffect, useState } from 'react'
import { useClientMask } from '@/lib/demo-mode'

interface OutstandingRow { staffId: string; staffName: string; outstanding: number; nextDeduction: number }
interface Advance {
  id:                 string
  staff_id:           string
  amount_ngn:         number
  repaid_ngn:         number
  weekly_cap_ngn:     number | null
  reason:             string | null
  given_at:           string
  status:             'outstanding' | 'deducted' | 'forgiven'
  deducted_at:        string | null
  deducted_payout_id: string | null
  users:              { name: string } | null
}
interface Staff    { id: string; name: string }
interface ListResp { advances: Advance[]; outstanding: OutstandingRow[]; staff: Staff[] }

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }
function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_PILL: Record<string, string> = {
  outstanding: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  deducted:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  forgiven:    'bg-[var(--border)] text-[var(--text-muted)] border-[var(--border-strong)]',
}

// The owner can grant advances (it's their money) and audit every kobo
// against the payouts the system auto-deducts. Editing and forgiving
// stay with the manager, who runs the till day to day — see
// /dashboard/manager/advances.
export default function OwnerAdvancesPage() {
  const mask = useClientMask()
  const [data, setData]       = useState<ListResp | null>(null)
  const [loading, setLoading] = useState(true)

  // Grant form
  const [grantStaffId, setGrantStaffId] = useState('')
  const [grantAmount, setGrantAmount]   = useState('')
  const [grantWeekly, setGrantWeekly]   = useState('')
  const [grantReason, setGrantReason]   = useState('')
  const [granting, setGranting]         = useState(false)
  const [grantError, setGrantError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/owner/advances')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault()
    setGrantError('')
    const amt = parseInt(grantAmount, 10) || 0
    if (!grantStaffId || amt <= 0) {
      setGrantError('Pick a staff and enter an amount above ₦0.')
      return
    }
    setGranting(true)
    try {
      const weekly = parseInt(grantWeekly, 10) || 0
      const res = await fetch('/api/owner/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: grantStaffId,
          amountNgn: amt,
          weeklyCapNgn: weekly > 0 ? weekly : null,
          reason: grantReason || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setGrantError(j.error ?? 'Failed to record advance.'); return }
      setGrantStaffId(''); setGrantAmount(''); setGrantWeekly(''); setGrantReason('')
      load()
    } catch {
      setGrantError('Connection error. Try again.')
    } finally {
      setGranting(false)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      <div className="mb-6">
        <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Staff Advances</h1>
        <p className="text-[var(--text-dim)] text-sm mt-0.5">
          Money given to staff mid-week — the system deducts outstanding amounts from each weekly payout. Editing and forgiving are done from the manager dashboard.
        </p>
      </div>

      {/* Grant form */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-4">Give an Advance</h2>
        <form onSubmit={handleGrant} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-1">
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Staff</label>
            <select value={grantStaffId} onChange={e => setGrantStaffId(e.target.value)}
              required className="input">
              <option value="">Pick staff…</option>
              {(data?.staff ?? []).map(s => <option key={s.id} value={s.id}>{mask.name(s.name)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Amount (₦)</label>
            <input type="text" inputMode="numeric"
              value={grantAmount}
              onChange={e => setGrantAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="5000" required className="input tabular-nums" />
          </div>
          <div>
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">
              Weekly deduction (₦) <span className="text-[var(--text-faint)] font-normal">— optional</span>
            </label>
            <input type="text" inputMode="numeric"
              value={grantWeekly}
              onChange={e => setGrantWeekly(e.target.value.replace(/\D/g, ''))}
              placeholder="Empty = all at once"
              className="input tabular-nums" />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">
              Reason <span className="text-[var(--text-faint)] font-normal">— optional</span>
            </label>
            <input type="text"
              value={grantReason}
              onChange={e => setGrantReason(e.target.value)}
              placeholder="e.g. School fees"
              maxLength={120}
              className="input" />
          </div>
          <p className="sm:col-span-4 text-[var(--text-faint)] text-[11px] -mt-1">
            Set a weekly deduction to collect the advance bit by bit — e.g. ₦2,000 per week from a ₦10,000 advance — so the staff member still takes money home each Sunday. Leave it empty to deduct everything from the next payout.
          </p>
          <div className="sm:col-span-4 flex items-center justify-between gap-3">
            {grantError ? (
              <p className="text-red-400 text-xs">{grantError}</p>
            ) : <span />}
            <button type="submit" disabled={granting}
              className="bg-[var(--text)] text-[var(--bg)] font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] transition-all">
              {granting ? 'Saving…' : 'Record Advance'}
            </button>
          </div>
        </form>
      </div>

      {/* Outstanding rollup */}
      <div className="mb-8">
        <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-3">Outstanding</h2>
        {loading ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-24 animate-pulse" />
        ) : (data?.outstanding.length ?? 0) === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-6 text-center">
            <p className="text-emerald-400 text-sm font-medium">No outstanding advances 🎉</p>
            <p className="text-[var(--text-faint)] text-xs mt-1">Nothing to deduct from this week&rsquo;s payout.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data!.outstanding.map(o => (
              <div key={o.staffId} className="bg-[var(--card)] border border-amber-500/20 rounded-xl px-4 py-3.5">
                <p className="text-[var(--text)] text-sm font-medium truncate">{mask.name(o.staffName)}</p>
                <p className="text-amber-400 text-xl font-bold tabular-nums mt-1">{fmtNaira(o.outstanding)}</p>
                <p className="text-[var(--text-faint)] text-[10px] mt-0.5">
                  {o.nextDeduction < o.outstanding
                    ? `${fmtNaira(o.nextDeduction)} will be deducted next Sunday (payment plan)`
                    : 'Will be deducted next Sunday'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <h2 className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-3">All Advances</h2>
        {loading ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-48 animate-pulse" />
        ) : (data?.advances.length ?? 0) === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-10 text-center">
            <p className="text-[var(--text-faint)] text-sm">No advances recorded yet.</p>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
            {data!.advances.map(a => (
              <div key={a.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[var(--text)] text-sm font-medium truncate">{mask.name(a.users?.name)}</p>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_PILL[a.status]}`}>
                      {a.status}
                    </span>
                    {a.weekly_cap_ngn && a.status === 'outstanding' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-sky-500/10 text-sky-400 border-sky-500/30">
                        {fmtNaira(a.weekly_cap_ngn)}/week
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-dim)] text-xs mt-0.5">
                    {fmtDate(a.given_at)}{a.reason ? ` · ${a.reason}` : ''}
                    {a.status === 'outstanding' && a.repaid_ngn > 0 && (
                      <span className="text-emerald-400"> · {fmtNaira(a.repaid_ngn)} repaid, {fmtNaira(Math.max(0, a.amount_ngn - a.repaid_ngn))} left</span>
                    )}
                  </p>
                </div>
                <p className="text-[var(--text)] text-sm font-semibold tabular-nums flex-shrink-0">
                  {fmtNaira(a.amount_ngn)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
