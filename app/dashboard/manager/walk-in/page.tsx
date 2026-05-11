'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Service, User } from '@/types/database'

type StaffMember = Omit<User, 'pin_hash'> & { serviceIds: string[] }

function fmtNaira(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

export default function WalkInPage() {
  const router = useRouter()

  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff]       = useState<StaffMember[]>([])
  const [loading, setLoading]   = useState(true)

  const [clientName, setClientName]       = useState('')
  const [clientPhone, setClientPhone]     = useState('')
  const [staffId, setStaffId]             = useState('')
  const [selectedIds, setSelectedIds]     = useState<string[]>([])
  const [tipNgn, setTipNgn]               = useState('')
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

  const selectedStaff    = staff.find(s => s.id === staffId) ?? null
  const staffServiceIds  = selectedStaff?.serviceIds ?? []
  const staffHasServices = staffServiceIds.length > 0

  function canDo(serviceId: string): boolean {
    if (!staffId || !staffHasServices) return true
    return staffServiceIds.includes(serviceId)
  }

  function toggle(id: string) {
    if (!canDo(id)) return
    setSelectedIds(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id])
  }

  function selectStaff(id: string) {
    setStaffId(id)
    const member = staff.find(s => s.id === id)
    if (member && member.serviceIds.length > 0) {
      setSelectedIds(p => p.filter(sid => member.serviceIds.includes(sid)))
    }
  }

  const selectedTotal = services
    .filter(s => selectedIds.includes(s.id))
    .reduce((sum, s) => sum + s.price_ngn, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/manager/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, clientPhone, staffId, serviceIds: selectedIds, tipNgn, paymentMethod }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setSuccess({ clientName: data.clientName, totalNgn: data.totalNgn, serviceCount: data.serviceCount, tipNgn: parseInt(tipNgn || '0', 10) })
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setClientName(''); setClientPhone(''); setStaffId('')
    setSelectedIds([]); setTipNgn(''); setPaymentMethod('cash'); setSuccess(null); setError('')
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
          <h2 className="text-white text-2xl font-bold">Visit Logged</h2>
          <p className="text-[#888] text-sm mt-2">
            {success.clientName} &middot; {success.serviceCount} service{success.serviceCount !== 1 ? 's' : ''}
          </p>
          <p className="text-white text-3xl font-bold tracking-tight mt-4">{fmtNaira(success.totalNgn)}</p>
          {success.tipNgn > 0 && (
            <p className="text-[#C49A3C] text-sm font-medium mt-1">+{fmtNaira(success.tipNgn)} tip recorded</p>
          )}
          <p className="text-[#555] text-xs mt-2">Follow-up scheduled in 7 days</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button onClick={reset}
              className="flex-1 bg-white text-gray-950 font-semibold py-3 rounded-xl text-sm hover:bg-gray-100 transition-all">
              Another Walk-in
            </button>
            <button onClick={() => router.push('/dashboard/manager')}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] font-medium py-3 rounded-xl text-sm hover:text-white transition-all">
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
          className="w-9 h-9 rounded-lg bg-[#141414] border border-[#1e1e1e] flex items-center justify-center text-[#888] hover:text-white transition-colors lg:hidden">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">New Walk-in</h1>
          <p className="text-[#555] text-sm mt-0.5">Log a client visit — takes under 30 seconds</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-80 animate-pulse" />
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-80 animate-pulse" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-5">

            {/* ── Left column — all details in one unified card ── */}
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden">

              {/* Client */}
              <div className="px-5 pt-5 pb-4">
                <p className="text-[#555] text-[11px] font-semibold uppercase tracking-wider mb-4">Client</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[#888] text-xs font-medium mb-1.5">Full Name</label>
                    <input type="text" value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="e.g. Emeka Obi"
                      required autoCapitalize="words"
                      className="input" />
                  </div>
                  <div>
                    <label className="block text-[#888] text-xs font-medium mb-1.5">Phone Number</label>
                    <input type="tel" value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      placeholder="08012345678"
                      required
                      className="input" />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#1e1e1e] px-5 py-4">
                <p className="text-[#555] text-[11px] font-semibold uppercase tracking-wider mb-3">Staff Member</p>
                <select
                  value={staffId}
                  onChange={e => selectStaff(e.target.value)}
                  className="input"
                  required>
                  <option value="">Select staff member…</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-[#1e1e1e] px-5 py-4">
                <p className="text-[#555] text-[11px] font-semibold uppercase tracking-wider mb-3">Payment Method</p>
                <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 gap-0.5">
                  {([
                    { value: 'cash',     label: 'Cash' },
                    { value: 'transfer', label: 'Transfer' },
                    { value: 'pos',      label: 'POS' },
                  ] as const).map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        paymentMethod === opt.value
                          ? 'bg-white text-gray-950 shadow-sm'
                          : 'text-[#666] hover:text-white'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#1e1e1e] px-5 py-4">
                <p className="text-[#555] text-[11px] font-semibold uppercase tracking-wider mb-3">
                  Tip <span className="normal-case text-[#444] font-normal">(optional)</span>
                </p>
                <div className="relative max-w-[180px]">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555] text-sm font-medium">₦</span>
                  <input
                    type="text" inputMode="numeric"
                    value={tipNgn}
                    onChange={e => setTipNgn(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="input pl-8"
                  />
                </div>
              </div>
            </div>

            {/* ── Right column — services flat list ── */}
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
                <p className="text-[#555] text-[11px] font-semibold uppercase tracking-wider">Services</p>
                {selectedTotal > 0 && (
                  <span className="text-white text-sm font-bold tabular-nums">{fmtNaira(selectedTotal)}</span>
                )}
              </div>

              {!staffId && (
                <div className="px-5 py-3 border-b border-[#1e1e1e]">
                  <p className="text-[#555] text-xs">Select a staff member to continue</p>
                </div>
              )}

              <div className="divide-y divide-[#1e1e1e] flex-1">
                {services.map(s => {
                  const on        = selectedIds.includes(s.id)
                  const available = canDo(s.id)
                  return (
                    <button key={s.id} type="button" onClick={() => toggle(s.id)}
                      disabled={!available}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all ${
                        on        ? 'bg-white/[0.04]'
                        : available ? 'hover:bg-[#1a1a1a]'
                        : 'opacity-30 cursor-not-allowed'
                      }`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                        on ? 'bg-white border-white' : available ? 'border-[#3a3a3a]' : 'border-[#2a2a2a]'
                      }`}>
                        {on && (
                          <svg className="w-2.5 h-2.5 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span className={`flex-1 text-sm font-medium ${on ? 'text-white' : available ? 'text-[#999]' : 'text-[#555]'}`}>
                        {s.name}
                      </span>
                      <span className={`text-sm tabular-nums font-semibold ${on ? 'text-white' : 'text-[#555]'}`}>
                        {fmtNaira(s.price_ngn)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button type="submit"
            disabled={submitting || selectedIds.length === 0 || !staffId || !clientName || !clientPhone}
            className="w-full bg-white text-gray-950 font-bold py-3.5 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-100 active:scale-[0.98] transition-all">
            {submitting ? 'Saving…' : selectedTotal > 0 ? `Log Visit · ${fmtNaira(selectedTotal)}` : 'Log Visit'}
          </button>
        </form>
      )}
    </div>
  )
}
