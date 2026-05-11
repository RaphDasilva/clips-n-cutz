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

  const [clientName, setClientName]   = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [staffId, setStaffId]         = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState<{
    clientName: string; totalNgn: number; serviceCount: number
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

  const selectedStaff = staff.find(s => s.id === staffId) ?? null

  // Services the selected staff member can perform (empty set = staff has no services configured = show all)
  const staffServiceIds = selectedStaff?.serviceIds ?? []
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
    // Drop any selected services the new staff can't do
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
        body: JSON.stringify({ clientName, clientPhone, staffId, serviceIds: selectedIds }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setSuccess({ clientName: data.clientName, totalNgn: data.totalNgn, serviceCount: data.serviceCount })
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setClientName(''); setClientPhone(''); setStaffId('')
    setSelectedIds([]); setSuccess(null); setError('')
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
          <div className="space-y-4">
            {[0,1,2].map(i => <div key={i} className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-14 animate-pulse" />)}
          </div>
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-64 animate-pulse" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Left — client + staff */}
            <div className="space-y-4">
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
                <h3 className="text-white text-sm font-semibold">Client Information</h3>

                <Field label="Full Name">
                  <input type="text" value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="e.g. Emeka Obi"
                    required autoCapitalize="words"
                    className="input" />
                </Field>

                <Field label="Phone Number">
                  <input type="tel" value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder="08012345678"
                    required
                    className="input" />
                </Field>
              </div>

              <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-4">Staff Member</h3>
                <div className="grid grid-cols-1 gap-2">
                  {staff.map(s => {
                    const active = staffId === s.id
                    return (
                      <button key={s.id} type="button"
                        onClick={() => selectStaff(s.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                          active
                            ? 'bg-white border-white text-gray-950'
                            : 'bg-[#1a1a1a] border-[#2a2a2a] text-white hover:border-[#3a3a3a]'
                        }`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                          active ? 'bg-gray-200 text-gray-950' : 'bg-[#2a2a2a] text-white'
                        }`}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{s.name}</p>
                          {s.serviceIds.length > 0 && (
                            <p className={`text-xs mt-0.5 truncate ${active ? 'text-gray-600' : 'text-[#555]'}`}>
                              {s.serviceIds.length} service{s.serviceIds.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right — services */}
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-white text-sm font-semibold">Services</h3>
                {selectedIds.length > 0 && (
                  <span className="text-white text-sm font-bold">{fmtNaira(selectedTotal)}</span>
                )}
              </div>

              {/* Hint when a staff member is selected and has services configured */}
              {staffId && staffHasServices && (
                <p className="text-[#555] text-xs mb-4">
                  Showing services {selectedStaff!.name.split(' ')[0]} offers — others are unavailable
                </p>
              )}
              {!staffId && (
                <p className="text-[#555] text-xs mb-4">Select a staff member first to see their services</p>
              )}
              {staffId && !staffHasServices && (
                <p className="text-[#555] text-xs mb-4">All services shown — no services configured for this staff</p>
              )}

              <div className="space-y-2">
                {services.map(s => {
                  const on        = selectedIds.includes(s.id)
                  const available = canDo(s.id)
                  return (
                    <button key={s.id} type="button" onClick={() => toggle(s.id)}
                      disabled={!available}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${
                        on
                          ? 'bg-white border-white text-gray-950'
                          : available
                            ? 'bg-[#1a1a1a] border-[#2a2a2a] text-white hover:border-[#3a3a3a]'
                            : 'bg-[#111] border-[#1a1a1a] text-[#333] cursor-not-allowed'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          on ? 'bg-gray-950 border-gray-950' : available ? 'border-[#444]' : 'border-[#222]'
                        }`}>
                          {on && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{s.name}</span>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${on ? 'text-gray-950' : available ? 'text-[#888]' : 'text-[#333]'}`}>
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
            className="w-full lg:w-auto lg:px-10 bg-white text-gray-950 font-bold py-3.5 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-100 active:scale-[0.98] transition-all">
            {submitting ? 'Saving…' : selectedTotal > 0 ? `Log Visit · ${fmtNaira(selectedTotal)}` : 'Log Visit'}
          </button>
        </form>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[#888] text-xs font-medium mb-1.5">{label}</label>
      {children}
    </div>
  )
}
