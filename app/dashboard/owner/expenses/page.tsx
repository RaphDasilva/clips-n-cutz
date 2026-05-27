'use client'

import { useCallback, useEffect, useState } from 'react'
import { useClientMask } from '@/lib/demo-mode'

interface ExpenseEntry {
  id: string
  date: string
  category: string
  amount_ngn: number
  vendor: string | null
  notes: string | null
  created_at: string
  users: { name: string } | null
}

interface ByCategory { category: string; amount: number }

const SUGGESTED_CATEGORIES = [
  'Products',
  'Electricity',
  'Water',
  'Rent',
  'Transport',
  'Maintenance',
  'Marketing',
  'Other',
]

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }
function fmtDay(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}
function lagosToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}
function monthStart() { return lagosToday().slice(0, 7) + '-01' }

export default function ExpensesPage() {
  const mask = useClientMask()
  const [items, setItems]         = useState<ExpenseEntry[]>([])
  const [byCategory, setByCategory] = useState<ByCategory[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [from, setFrom]           = useState(monthStart())
  const [to, setTo]               = useState(lagosToday())

  const [showAdd, setShowAdd]     = useState(false)
  const [newDate, setNewDate]     = useState(lagosToday())
  const [newCat, setNewCat]       = useState('Products')
  const [newAmount, setNewAmount] = useState('')
  const [newVendor, setNewVendor] = useState('')
  const [newNotes, setNewNotes]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const [deleteId, setDeleteId]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/owner/expenses?from=${from}&to=${to}&limit=500`)
    if (res.ok) {
      const j = await res.json()
      setItems(j.items ?? [])
      setByCategory(j.byCategory ?? [])
      setTotal(j.total ?? 0)
    }
    setLoading(false)
  }, [from, to])

  useEffect(() => { load() }, [load])

  async function saveExpense() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/owner/expenses', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          date:      newDate,
          category:  newCat,
          amountNgn: parseInt(newAmount.replace(/\D/g, ''), 10) || 0,
          vendor:    newVendor,
          notes:     newNotes,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Failed to save.')
        return
      }
      setShowAdd(false)
      setNewDate(lagosToday()); setNewCat('Products'); setNewAmount(''); setNewVendor(''); setNewNotes('')
      load()
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    await fetch(`/api/owner/expenses/${deleteId}`, { method: 'DELETE' })
    setDeleteId(null)
    load()
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-[var(--text-dim)] text-sm mt-1">Money out — products, bills, supplies.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 bg-[var(--text)] text-[var(--bg)] font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all w-fit">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Date range */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6 bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
        <div className="flex-1">
          <label className="block text-[var(--text-dim)] text-[10px] font-bold uppercase tracking-wider mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input" />
        </div>
        <div className="flex-1">
          <label className="block text-[var(--text-dim)] text-[10px] font-bold uppercase tracking-wider mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input" />
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-[var(--text-dim)] text-[10px] font-bold uppercase tracking-wider mb-1">Total</p>
            <p className="text-[var(--text)] text-xl font-bold tabular-nums">{fmtNaira(total)}</p>
          </div>
          {byCategory.slice(0, 3).map(c => (
            <div key={c.category} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-[var(--text-dim)] text-[10px] font-bold uppercase tracking-wider mb-1 truncate">{c.category}</p>
              <p className="text-[var(--text)] text-xl font-bold tabular-nums">{fmtNaira(c.amount)}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0,1,2].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-16 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-6 py-16 text-center">
          <p className="text-[var(--text-faint)] text-sm">No expenses in this range.</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
          {items.map(r => (
            <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3 group">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--text)] text-sm font-medium">
                  {r.category}
                  {r.vendor && <span className="text-[var(--text-dim)] font-normal ml-2">· {r.vendor}</span>}
                </p>
                <p className="text-[var(--text-dim)] text-[11px] mt-0.5">
                  {fmtDay(r.date)}{r.users?.name && <> · {mask.name(r.users.name)}</>}
                </p>
                {r.notes && <p className="text-[var(--text-muted)] text-[11px] italic mt-1">&ldquo;{r.notes}&rdquo;</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="text-red-400 text-sm font-bold tabular-nums">-{fmtNaira(r.amount_ngn)}</p>
                <button onClick={() => setDeleteId(r.id)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-faint)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-60 group-hover:opacity-100">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => !saving && setShowAdd(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border-strong)] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border)]">
              <h2 className="text-[var(--text)] font-semibold">New Expense</h2>
              <button onClick={() => setShowAdd(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--elevated)]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Date</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Amount (₦)</label>
                  <input type="text" inputMode="numeric"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="input" />
                </div>
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Category</label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {SUGGESTED_CATEGORIES.map(c => (
                    <button key={c} type="button" onClick={() => setNewCat(c)}
                      className={`text-[10px] font-medium px-2 py-1.5 rounded-md border transition-all ${
                        newCat === c
                          ? 'bg-[var(--text)] text-[var(--bg)] border-[var(--text)]'
                          : 'bg-[var(--elevated)] border-[var(--border-strong)] text-[var(--text-muted)]'
                      }`}>{c}</button>
                  ))}
                </div>
                <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Or type a custom category" className="input" />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Vendor <span className="text-[var(--text-faint)] font-normal">(optional)</span></label>
                <input type="text" value={newVendor} onChange={e => setNewVendor(e.target.value)} placeholder="e.g. ABC Hair Supplies" className="input" />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Notes <span className="text-[var(--text-faint)] font-normal">(optional)</span></label>
                <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)} className="input" />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button onClick={saveExpense} disabled={saving || !newAmount || !newCat}
                className="w-full bg-[var(--text)] text-[var(--bg)] font-bold py-3 rounded-xl text-sm hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all disabled:opacity-40">
                {saving ? 'Saving…' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteId(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-[var(--text)] font-semibold mb-2">Delete this expense?</h2>
            <p className="text-[var(--text-muted)] text-sm mb-5">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 bg-[var(--elevated)] border border-[var(--border-strong)] text-[var(--text)] font-medium py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={confirmDelete}
                className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-2.5 rounded-xl text-sm hover:bg-red-500/20">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
