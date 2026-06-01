'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClientMask } from '@/lib/demo-mode'

interface BankInfo {
  bankName:      string | null
  accountNumber: string | null
  accountName:   string | null
}

interface PayoutRow {
  staffId:         string
  staffName:       string
  bank:            BankInfo
  commission_ngn:  number
  tips_ngn:        number
  penalty_ngn:     number
  total_ngn:       number
  status:          'pending' | 'paid'
  paid_at:         string | null
  paid_amount_ngn: number | null
  notes:           string | null
  payoutId:        string | null
}

interface PayoutResp {
  weekStart: string
  weekEnd:   string
  rows:      PayoutRow[]
  summary: {
    totalCommission: number
    totalTips:       number
    totalPenalty:    number
    totalPayout:     number
    pendingCount:    number
    paidCount:       number
  }
}

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }

function fmtRange(start: string, end: string) {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end   + 'T12:00:00')
  const sMon = s.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
  const eMon = e.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${sMon} – ${eMon}`
}

function lagosToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function PayoutsPage() {
  const mask = useClientMask()
  const [weekRef, setWeekRef] = useState<string>(lagosToday())
  const [data, setData]       = useState<PayoutResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying]   = useState<string | null>(null)
  const [error, setError]     = useState('')

  // Pay modal
  const [payTarget, setPayTarget] = useState<PayoutRow | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNotes, setPayNotes]   = useState('')

  const load = useCallback(async (ref: string) => {
    setLoading(true); setError('')
    const res = await fetch(`/api/owner/payouts?week=${ref}`)
    if (!res.ok) { setError('Failed to load payouts.'); setLoading(false); return }
    setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load(weekRef) }, [load, weekRef])

  const isCurrentWeek = useMemo(() => {
    if (!data) return false
    return weekBoundaries(lagosToday()).start === data.weekStart
  }, [data, weekRef]) // eslint-disable-line react-hooks/exhaustive-deps

  function openPay(row: PayoutRow) {
    setPayTarget(row)
    setPayAmount(String(row.total_ngn))
    setPayNotes('')
  }

  async function confirmPay() {
    if (!payTarget || !data) return
    setPaying(payTarget.staffId); setError('')
    const res = await fetch('/api/owner/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId:    payTarget.staffId,
        weekStart:  data.weekStart,
        paidAmount: parseInt(payAmount, 10) || payTarget.total_ngn,
        notes:      payNotes.trim() || null,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to record payout.')
      setPaying(null); return
    }
    setPayTarget(null); setPaying(null)
    load(weekRef)
  }

  async function unmark(row: PayoutRow) {
    if (!row.payoutId) return
    if (!confirm(`Unmark ${mask.name(row.staffName)}'s payment for this week? The total will be recomputed from current data.`)) return
    setPaying(row.staffId); setError('')
    const res = await fetch(`/api/owner/payouts/${row.payoutId}`, { method: 'DELETE' })
    setPaying(null)
    if (!res.ok) { setError('Failed to unmark.'); return }
    load(weekRef)
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Weekly Payouts</h1>
          <p className="text-[var(--text-dim)] text-sm mt-1">Pay staff every Sunday — Monday through Sunday earnings, net of any penalties.</p>
        </div>
        <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1">
          <button onClick={() => setWeekRef(addDays(weekRef, -7))}
            className="px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elevated)] rounded-md text-xs font-medium transition-all">
            ← Prev
          </button>
          <button onClick={() => setWeekRef(lagosToday())}
            className="px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elevated)] rounded-md text-xs font-medium transition-all">
            This week
          </button>
          <button onClick={() => setWeekRef(addDays(weekRef, 7))}
            className="px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elevated)] rounded-md text-xs font-medium transition-all">
            Next →
          </button>
        </div>
      </div>

      {/* Period label + summary */}
      {data && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[var(--text-dim)] text-[11px] font-semibold uppercase tracking-wider">
              {isCurrentWeek ? 'Current week (in progress)' : 'Week of'}
            </p>
            <p className="text-[var(--text)] text-base font-semibold">{fmtRange(data.weekStart, data.weekEnd)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 font-medium">
              {data.summary.pendingCount} pending
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
              {data.summary.paidCount} paid
            </span>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {!loading && data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard label="Total Commission" value={fmtNaira(data.summary.totalCommission)} />
          <SummaryCard label="Total Tips"       value={fmtNaira(data.summary.totalTips)}       accent="emerald" />
          <SummaryCard label="Total Penalties"  value={data.summary.totalPenalty > 0 ? `-${fmtNaira(data.summary.totalPenalty)}` : '—'} accent="red" />
          <SummaryCard label="Total Payroll"    value={fmtNaira(data.summary.totalPayout)}     accent="gold" />
        </div>
      )}

      {/* Per-staff rows */}
      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-20 animate-pulse" />)}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-12 text-center">
          <p className="text-[var(--text-faint)] text-sm">No active staff to pay.</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
          {data.rows.map(row => (
            <div key={row.staffId} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 sm:w-44 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-[var(--elevated)] border border-[var(--border-strong)] flex items-center justify-center">
                  <span className="text-[var(--text)] text-sm font-semibold">{mask.name(row.staffName).charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[var(--text)] font-medium leading-tight">{mask.name(row.staffName)}</p>
                  {row.bank.accountNumber ? (
                    <p className="text-[var(--text-dim)] text-[10px] mt-0.5 truncate">
                      {row.bank.bankName ?? 'Bank'} · <span className="tabular-nums">{row.bank.accountNumber}</span>
                    </p>
                  ) : (
                    <p className="text-amber-500/80 text-[10px] mt-0.5">No bank details on file</p>
                  )}
                  {row.status === 'paid' && (
                    <p className="text-emerald-500 text-[10px] font-medium mt-0.5">
                      Paid {row.paid_at ? new Date(row.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 flex-1 text-xs">
                <Stat label="Commission" value={fmtNaira(row.commission_ngn)} />
                <Stat label="Tips"       value={row.tips_ngn > 0 ? fmtNaira(row.tips_ngn) : '—'} tone={row.tips_ngn > 0 ? 'emerald' : 'mute'} />
                <Stat label="Penalty"    value={row.penalty_ngn > 0 ? `-${fmtNaira(row.penalty_ngn)}` : '—'} tone={row.penalty_ngn > 0 ? 'red' : 'mute'} />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-72 flex-shrink-0">
                <div className="text-right">
                  <p className="text-[var(--text-dim)] text-[10px] font-semibold uppercase tracking-wider">Net Payout</p>
                  <p className={`text-lg font-bold tabular-nums ${row.status === 'paid' ? 'text-emerald-500' : 'text-[var(--accent)]'}`}>
                    {fmtNaira(row.paid_amount_ngn ?? row.total_ngn)}
                  </p>
                </div>
                {row.status === 'pending' ? (
                  <button onClick={() => openPay(row)} disabled={paying === row.staffId || row.total_ngn === 0}
                    className="bg-[var(--text)] text-[var(--bg)] text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 flex-shrink-0">
                    {paying === row.staffId ? 'Saving…' : 'Mark Paid'}
                  </button>
                ) : (
                  <button onClick={() => unmark(row)} disabled={paying === row.staffId}
                    className="text-red-400 text-xs font-medium px-3 py-2 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-40 flex-shrink-0">
                    Unmark
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pay modal */}
      {payTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => paying ? null : setPayTarget(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border-strong)] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border)]">
              <div>
                <h2 className="text-[var(--text)] font-semibold">Pay {mask.name(payTarget.staffName)}</h2>
                <p className="text-[var(--text-dim)] text-xs mt-0.5">Week of {data && fmtRange(data.weekStart, data.weekEnd)}</p>
              </div>
              <button onClick={() => setPayTarget(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--elevated)]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Bank details for the transfer */}
              {payTarget.bank.accountNumber ? (
                <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/30 rounded-lg p-3 space-y-1.5">
                  <p className="text-[var(--accent)] text-[10px] font-semibold uppercase tracking-wider">Send to</p>
                  <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)] text-xs">Bank</span><span className="text-[var(--text)] text-sm font-medium">{payTarget.bank.bankName ?? '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)] text-xs">Account #</span><span className="text-[var(--text)] text-sm font-semibold tabular-nums">{payTarget.bank.accountNumber}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)] text-xs">Name</span><span className="text-[var(--text)] text-sm">{payTarget.bank.accountName ?? mask.name(payTarget.staffName)}</span></div>
                </div>
              ) : (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg px-3 py-2">
                  <p className="text-amber-500 text-xs">No bank details on file for this staff member yet.</p>
                </div>
              )}
              <div className="bg-[var(--elevated)] border border-[var(--border)] rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Commission</span><span className="text-[var(--text)] tabular-nums">{fmtNaira(payTarget.commission_ngn)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Tips</span><span className="text-emerald-500 tabular-nums">{fmtNaira(payTarget.tips_ngn)}</span></div>
                {payTarget.penalty_ngn > 0 && (
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Penalty</span><span className="text-red-400 tabular-nums">-{fmtNaira(payTarget.penalty_ngn)}</span></div>
                )}
                <div className="flex justify-between pt-2 border-t border-[var(--border)]"><span className="text-[var(--text)] font-semibold">Computed Total</span><span className="text-[var(--accent)] font-bold tabular-nums">{fmtNaira(payTarget.total_ngn)}</span></div>
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Amount paid (₦)</label>
                <input type="text" inputMode="numeric"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value.replace(/\D/g, ''))}
                  className="input" />
                <p className="text-[var(--text-faint)] text-[10px] mt-1">Adjust only if paying a different amount (e.g. rounded cash).</p>
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Notes (optional)</label>
                <input type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g. paid in cash"
                  className="input" />
              </div>
              <button onClick={confirmPay} disabled={paying === payTarget.staffId}
                className="w-full bg-[var(--accent)] text-[var(--on-accent)] font-bold py-3 rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40">
                {paying === payTarget.staffId ? 'Recording…' : `Mark Paid · ${fmtNaira(parseInt(payAmount, 10) || payTarget.total_ngn)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: 'gold' | 'emerald' | 'red' }) {
  return (
    <div className={`bg-[var(--card)] border rounded-xl p-4 ${
      accent === 'gold'    ? 'border-[var(--accent)]/30'      :
      accent === 'emerald' ? 'border-emerald-500/20'         :
      accent === 'red'     ? 'border-red-500/20'             :
      'border-[var(--border)]'
    }`}>
      <p className="text-[var(--text-dim)] text-[10px] font-semibold uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${
        accent === 'gold'    ? 'text-[var(--accent)]'  :
        accent === 'emerald' ? 'text-emerald-400'      :
        accent === 'red'     ? 'text-red-400'          :
        'text-[var(--text)]'
      }`}>{value}</p>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'red' | 'mute' }) {
  return (
    <div>
      <p className="text-[var(--text-dim)] text-[10px] font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${
        tone === 'emerald' ? 'text-emerald-500' :
        tone === 'red'     ? 'text-red-400'     :
        tone === 'mute'    ? 'text-[var(--text-faint)]' :
        'text-[var(--text)]'
      }`}>{value}</p>
    </div>
  )
}

// helper used by isCurrentWeek
function weekBoundaries(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getUTCDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(d); monday.setUTCDate(d.getUTCDate() + diffToMon)
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6)
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) }
}
