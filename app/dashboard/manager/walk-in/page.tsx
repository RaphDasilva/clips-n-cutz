'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Service, User } from '@/types/database'
import ServicePicker from '@/components/ServicePicker'
import { useClientMask } from '@/lib/demo-mode'

type StaffMember = Omit<User, 'pin_hash'> & { serviceIds: string[] }

interface Line { key: string; serviceId: string; staffId: string; priceNgn: string }

function fmtNaira(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

// Only dye services can have their price adjusted at checkout
// (e.g. charging extra to dye a full head of hair).
function isPriceEditable(name: string) {
  return name.toLowerCase().includes('dye')
}

function newKey() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function WalkInPage() {
  const router = useRouter()
  const mask = useClientMask()

  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff]       = useState<StaffMember[]>([])
  const [loading, setLoading]   = useState(true)

  const [clientName, setClientName]         = useState('')
  const [clientPhone, setClientPhone]       = useState('')
  const [defaultStaffId, setDefaultStaffId] = useState('')
  const [lines, setLines]                   = useState<Line[]>([])
  const [tipByStaff, setTipByStaff]         = useState<Record<string, string>>({})
  const [paymentMethod, setPaymentMethod]   = useState<'cash' | 'transfer' | 'pos'>('cash')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState<{
    clientName: string; totalNgn: number; serviceCount: number; tipNgn: number
  } | null>(null)

  useEffect(() => {
    async function load() {
      const [sRes, stRes] = await Promise.all([
        fetch('/api/manager/services'),
        fetch('/api/manager/staff'),
      ])
      const [sData, stData] = await Promise.all([sRes.json(), stRes.json()])
      setServices(sData.services ?? [])
      setStaff((stData.staff ?? []).filter((s: StaffMember) => s.is_active))
      setLoading(false)
    }
    load()
  }, [])

  const staffById   = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff])
  const serviceById = useMemo(() => new Map(services.map(s => [s.id, s])), [services])

  // ServicePicker is set-based — it deals in unique service IDs.
  // Lines is the source of truth; selectedIds is derived.
  const selectedIds = useMemo(
    () => Array.from(new Set(lines.map(l => l.serviceId))),
    [lines]
  )

  function handleServicesChange(nextIds: string[]) {
    const currentSet = new Set(selectedIds)
    const nextSet    = new Set(nextIds)

    // Drop lines whose service was deselected
    const kept = lines.filter(l => nextSet.has(l.serviceId))

    // Append a single line for each newly added service
    const added: Line[] = nextIds
      .filter(id => !currentSet.has(id))
      .map(serviceId => ({
        key: newKey(), serviceId, staffId: defaultStaffId,
        priceNgn: String(serviceById.get(serviceId)?.price_ngn ?? ''),
      }))

    setLines([...kept, ...added])
  }

  function duplicateLine(key: string) {
    setLines(prev => {
      const idx = prev.findIndex(l => l.key === key)
      if (idx < 0) return prev
      const src = prev[idx]
      const dup: Line = { key: newKey(), serviceId: src.serviceId, staffId: src.staffId, priceNgn: src.priceNgn }
      return [...prev.slice(0, idx + 1), dup, ...prev.slice(idx + 1)]
    })
  }

  function removeLine(key: string) {
    setLines(prev => prev.filter(l => l.key !== key))
  }

  function setLineStaff(key: string, staffId: string) {
    setLines(prev => prev.map(l => l.key === key ? { ...l, staffId } : l))
  }

  function setLinePrice(key: string, priceNgn: string) {
    setLines(prev => prev.map(l => l.key === key ? { ...l, priceNgn } : l))
  }

  // Fill any line missing a staff with the new default
  useEffect(() => {
    if (!defaultStaffId) return
    setLines(prev => {
      let changed = false
      const next = prev.map(l => {
        if (!l.staffId) { changed = true; return { ...l, staffId: defaultStaffId } }
        return l
      })
      return changed ? next : prev
    })
  }, [defaultStaffId])

  // Unique staff currently assigned to at least one line
  const involvedStaffIds = useMemo(() => {
    const ids = new Set<string>()
    for (const l of lines) if (l.staffId) ids.add(l.staffId)
    return Array.from(ids)
  }, [lines])

  // Prune tip entries for staff no longer involved
  useEffect(() => {
    setTipByStaff(prev => {
      const next: Record<string, string> = {}
      for (const id of involvedStaffIds) {
        if (prev[id] !== undefined) next[id] = prev[id]
      }
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
  }, [involvedStaffIds])

  const selectedTotal = lines.reduce(
    (sum, l) => sum + (parseInt(l.priceNgn, 10) || 0),
    0
  )

  const totalTipsEntered = Object.values(tipByStaff)
    .reduce((s, v) => s + (parseInt(v, 10) || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (lines.length === 0) { setError('Pick at least one service.'); return }
    const unassigned = lines.find(l => !l.staffId)
    if (unassigned) {
      setError('Every line needs a staff member.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/manager/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName, clientPhone,
          lines:         lines.map(({ serviceId, staffId, priceNgn }) => ({
            serviceId, staffId, priceNgn: parseInt(priceNgn, 10) || 0,
          })),
          tipByStaff,
          paymentMethod,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setSuccess({
        clientName:   data.clientName,
        totalNgn:     data.totalNgn,
        serviceCount: data.serviceCount,
        tipNgn:       totalTipsEntered,
      })
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setClientName(''); setClientPhone(''); setDefaultStaffId('')
    setLines([]); setTipByStaff({})
    setPaymentMethod('cash'); setSuccess(null); setError('')
  }

  /* ── Success screen ─────────────────────────────────────── */
  if (success) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">
        <div className="max-w-sm mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-[var(--text)] text-2xl font-bold">Visit Logged</h2>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            {mask.name(success.clientName)} &middot; {success.serviceCount} service{success.serviceCount !== 1 ? 's' : ''}
          </p>
          <p className="text-[var(--text)] text-3xl font-bold tracking-tight mt-4">{fmtNaira(success.totalNgn)}</p>
          {success.tipNgn > 0 && (
            <p className="text-[var(--accent)] text-sm font-medium mt-1">+{fmtNaira(success.tipNgn)} tip recorded</p>
          )}
          <p className="text-[var(--text-dim)] text-xs mt-2">Follow-up scheduled in 7 days</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button onClick={reset}
              className="flex-1 bg-[var(--text)] text-[var(--bg)] font-semibold py-3 rounded-xl text-sm hover:bg-[var(--text-muted)] transition-all">
              Another Walk-in
            </button>
            <button onClick={() => router.push('/dashboard/manager')}
              className="flex-1 bg-[var(--elevated)] border border-[var(--border-strong)] text-[var(--text-muted)] font-medium py-3 rounded-xl text-sm hover:text-[var(--text)] transition-all">
              Back to Today
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Form ───────────────────────────────────────────────── */
  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors lg:hidden">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">New Walk-in</h1>
          <p className="text-[var(--text-dim)] text-sm mt-0.5">Add multiple of the same service for groups (e.g. 3× Cut for 3 friends)</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-80 animate-pulse" />
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-80 animate-pulse" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-5">

            {/* ── Left column ── */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">

              <div className="px-5 pt-5 pb-4">
                <p className="text-[var(--text-dim)] text-[11px] font-semibold uppercase tracking-wider mb-4">Client</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Full Name</label>
                    <input type="text" value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="e.g. Emeka Obi"
                      required autoCapitalize="words"
                      className="input" />
                    <p className="text-[var(--text-dim)] text-[10px] mt-1">
                      For groups, use the payer&apos;s name only.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">
                      Phone Number <span className="text-[var(--text-dim)] font-normal">(optional)</span>
                    </label>
                    <input type="tel" value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      placeholder="08012345678 — leave blank if not given"
                      className="input" />
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)] px-5 py-4">
                <p className="text-[var(--text-dim)] text-[11px] font-semibold uppercase tracking-wider mb-2">Default Staff</p>
                <select
                  value={defaultStaffId}
                  onChange={e => setDefaultStaffId(e.target.value)}
                  className="input">
                  <option value="">No default — assign each line manually</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <p className="text-[var(--text-dim)] text-[10px] mt-2">
                  Auto-assigned to new lines. Change per line on the right.
                </p>
              </div>

              <div className="border-t border-[var(--border)] px-5 py-4">
                <p className="text-[var(--text-dim)] text-[11px] font-semibold uppercase tracking-wider mb-3">Payment Method</p>
                <div className="flex bg-[var(--elevated)] rounded-lg p-0.5 gap-0.5">
                  {([
                    { value: 'cash',     label: 'Cash' },
                    { value: 'transfer', label: 'Transfer' },
                    { value: 'pos',      label: 'POS' },
                  ] as const).map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        paymentMethod === opt.value
                          ? 'bg-[var(--text)] text-[var(--bg)] shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right column — services + lines + tips ── */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 flex flex-col gap-5">

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[var(--text-dim)] text-[11px] font-semibold uppercase tracking-wider">Services</p>
                  {selectedTotal > 0 && (
                    <span className="text-[var(--text)] text-sm font-bold tabular-nums">{fmtNaira(selectedTotal)}</span>
                  )}
                </div>

                <ServicePicker
                  services={services}
                  selectedIds={selectedIds}
                  onChange={handleServicesChange}
                  placeholder="+ Add services for this visit"
                />
              </div>

              {lines.length > 0 && (
                <div className="border-t border-[var(--border)] pt-4">
                  <p className="text-[var(--text-dim)] text-[11px] font-semibold uppercase tracking-wider mb-3">
                    Who did what
                  </p>
                  <div className="space-y-2">
                    {lines.map(line => {
                      const sv = serviceById.get(line.serviceId)
                      if (!sv) return null
                      return (
                        <div key={line.key} className="flex items-center gap-2 bg-[var(--elevated)] border border-[var(--border)] rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text)] text-sm font-medium truncate">{sv.name}</p>
                            {isPriceEditable(sv.name) ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[var(--text-dim)] text-[11px]">₦</span>
                                <input type="text" inputMode="numeric"
                                  value={line.priceNgn}
                                  onChange={e => setLinePrice(line.key, e.target.value.replace(/\D/g, ''))}
                                  className="w-20 bg-[var(--card)] border border-[var(--border-strong)] rounded px-1.5 py-0.5 text-[11px] text-[var(--text)] tabular-nums focus:outline-none focus:border-[var(--accent)]" />
                                {parseInt(line.priceNgn, 10) !== sv.price_ngn && (
                                  <span className="text-[var(--text-faint)] text-[10px]">was {fmtNaira(sv.price_ngn)}</span>
                                )}
                              </div>
                            ) : (
                              <p className="text-[var(--text-dim)] text-[11px] tabular-nums mt-0.5">{fmtNaira(parseInt(line.priceNgn, 10) || sv.price_ngn)}</p>
                            )}
                          </div>
                          <select value={line.staffId}
                            onChange={e => setLineStaff(line.key, e.target.value)}
                            className={`bg-[var(--card)] border rounded-md px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-[var(--accent)] ${
                              line.staffId ? 'border-[var(--border-strong)] text-[var(--text)]' : 'border-amber-500/40 text-amber-500'
                            }`}>
                            <option value="">Pick staff…</option>
                            {staff.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => duplicateLine(line.key)}
                            title="Add another of this service"
                            className="w-7 h-7 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 flex items-center justify-center transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                          </button>
                          <button type="button" onClick={() => removeLine(line.key)}
                            title="Remove this line"
                            className="w-7 h-7 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[var(--text-dim)] text-[10px] mt-2">
                    Tap <span className="text-[var(--accent)]">+</span> to add another of the same service. Dye services let you
                    edit the ₦ amount for extra hair — staff commission follows the new amount.
                  </p>
                </div>
              )}

              {involvedStaffIds.length > 0 && (
                <div className="border-t border-[var(--border)] pt-4">
                  <p className="text-[var(--text-dim)] text-[11px] font-semibold uppercase tracking-wider mb-3">
                    Tips <span className="text-[var(--text-faint)] font-normal normal-case">(optional, per staff)</span>
                  </p>
                  <div className="space-y-2">
                    {involvedStaffIds.map(sid => {
                      const s = staffById.get(sid)
                      if (!s) return null
                      return (
                        <div key={sid} className="flex items-center gap-3">
                          <p className="text-[var(--text)] text-sm font-medium flex-1 truncate">{s.name}</p>
                          <div className="relative w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] text-sm">₦</span>
                            <input type="text" inputMode="numeric"
                              value={tipByStaff[sid] ?? ''}
                              onChange={e => setTipByStaff(prev => ({ ...prev, [sid]: e.target.value.replace(/\D/g, '') }))}
                              placeholder="0"
                              className="input pl-7 text-right" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {totalTipsEntered > 0 && (
                    <p className="text-[var(--accent)] text-[11px] font-semibold mt-2 text-right tabular-nums">
                      Total tips: {fmtNaira(totalTipsEntered)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button type="submit"
            disabled={submitting || lines.length === 0 || !clientName}
            className="w-full bg-[var(--text)] text-[var(--bg)] font-bold py-3.5 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all">
            {submitting ? 'Saving…' : selectedTotal > 0 ? `Log Visit · ${fmtNaira(selectedTotal)}` : 'Log Visit'}
          </button>
        </form>
      )}
    </div>
  )
}
