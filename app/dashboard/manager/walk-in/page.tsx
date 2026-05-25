'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Service, User } from '@/types/database'
import ServicePicker from '@/components/ServicePicker'

type StaffMember = Omit<User, 'pin_hash'> & { serviceIds: string[] }

function fmtNaira(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

export default function WalkInPage() {
  const router = useRouter()

  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff]       = useState<StaffMember[]>([])
  const [loading, setLoading]   = useState(true)

  const [clientName, setClientName]     = useState('')
  const [clientPhone, setClientPhone]   = useState('')
  const [defaultStaffId, setDefaultStaffId] = useState('')
  const [selectedIds, setSelectedIds]   = useState<string[]>([])
  const [staffByService, setStaffByService] = useState<Record<string, string>>({})
  const [tipByStaff, setTipByStaff]     = useState<Record<string, string>>({})
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'pos'>('cash')

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

  // Each selected service's chosen staff defaults to defaultStaffId.
  // If the default changes, only services that haven't been re-assigned
  // pick up the new default — leave already-customised ones alone.
  function handleServicesChange(nextIds: string[]) {
    setSelectedIds(nextIds)
    setStaffByService(prev => {
      const next: Record<string, string> = {}
      for (const id of nextIds) {
        next[id] = prev[id] ?? defaultStaffId
      }
      return next
    })
  }

  function setServiceStaff(serviceId: string, staffId: string) {
    setStaffByService(prev => ({ ...prev, [serviceId]: staffId }))
  }

  // Whenever default changes, fill in any unassigned services with the new default
  useEffect(() => {
    if (!defaultStaffId) return
    setStaffByService(prev => {
      const next = { ...prev }
      for (const id of selectedIds) {
        if (!next[id]) next[id] = defaultStaffId
      }
      return next
    })
  }, [defaultStaffId, selectedIds])

  // Unique staff currently assigned to at least one selected service
  const involvedStaffIds = useMemo(() => {
    const ids = new Set<string>()
    for (const id of selectedIds) {
      const s = staffByService[id]
      if (s) ids.add(s)
    }
    return Array.from(ids)
  }, [selectedIds, staffByService])

  // Prune tip entries when their staff is no longer involved
  useEffect(() => {
    setTipByStaff(prev => {
      const next: Record<string, string> = {}
      for (const id of involvedStaffIds) {
        if (prev[id] !== undefined) next[id] = prev[id]
      }
      return next
    })
  }, [involvedStaffIds])

  const selectedTotal = selectedIds
    .map(id => serviceById.get(id))
    .filter((s): s is Service => Boolean(s))
    .reduce((sum, s) => sum + s.price_ngn, 0)

  const totalTipsEntered = Object.values(tipByStaff)
    .reduce((s, v) => s + (parseInt(v, 10) || 0), 0)

  // For the per-service staff dropdown: when a default staff has a
  // restricted service list, we still show every staff member —
  // splitting work between staff is the whole point. We rely on the
  // manager to assign appropriately.

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (selectedIds.length === 0) { setError('Pick at least one service.'); return }
    const unassigned = selectedIds.find(id => !staffByService[id])
    if (unassigned) {
      setError('Every service needs a staff member assigned.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/manager/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName, clientPhone,
          serviceIds:     selectedIds,
          staffByService,
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
    setSelectedIds([]); setStaffByService({}); setTipByStaff({})
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
            {success.clientName} &middot; {success.serviceCount} service{success.serviceCount !== 1 ? 's' : ''}
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

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors lg:hidden">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">New Walk-in</h1>
          <p className="text-[var(--text-dim)] text-sm mt-0.5">Log a client visit — assign staff per service</p>
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

              {/* Client */}
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
                  <option value="">No default — assign each service manually</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <p className="text-[var(--text-dim)] text-[10px] mt-2">
                  Auto-assigned to new services. Change per service on the right.
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

            {/* ── Right column — services + assignments + tips ── */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 flex flex-col gap-5">

              {/* Service picker */}
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

              {/* Per-service staff assignment */}
              {selectedIds.length > 0 && (
                <div className="border-t border-[var(--border)] pt-4">
                  <p className="text-[var(--text-dim)] text-[11px] font-semibold uppercase tracking-wider mb-3">
                    Who did what
                  </p>
                  <div className="space-y-2">
                    {selectedIds.map(sid => {
                      const sv  = serviceById.get(sid)
                      if (!sv) return null
                      const assigned = staffByService[sid] ?? ''
                      return (
                        <div key={sid} className="flex items-center gap-2 bg-[var(--elevated)] border border-[var(--border)] rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text)] text-sm font-medium truncate">{sv.name}</p>
                            <p className="text-[var(--text-dim)] text-[11px] tabular-nums">{fmtNaira(sv.price_ngn)}</p>
                          </div>
                          <select value={assigned}
                            onChange={e => setServiceStaff(sid, e.target.value)}
                            className={`bg-[var(--card)] border rounded-md px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-[var(--accent)] ${
                              assigned ? 'border-[var(--border-strong)] text-[var(--text)]' : 'border-amber-500/40 text-amber-500'
                            }`}>
                            <option value="">Pick staff…</option>
                            {staff.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Per-staff tips */}
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
            disabled={submitting || selectedIds.length === 0 || !clientName}
            className="w-full bg-[var(--text)] text-[var(--bg)] font-bold py-3.5 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all">
            {submitting ? 'Saving…' : selectedTotal > 0 ? `Log Visit · ${fmtNaira(selectedTotal)}` : 'Log Visit'}
          </button>
        </form>
      )}
    </div>
  )
}
