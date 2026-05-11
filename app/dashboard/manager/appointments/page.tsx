'use client'

import { useState, useEffect } from 'react'
import { getSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface ApptService {
  service_id: string
  services: { name: string; price_ngn: number } | null
}

interface ApptRow {
  id: string
  scheduled_at: string
  status: string
  source: string
  clients: { id: string; name: string; phone: string } | null
  appointment_services: ApptService[]
  users: { name: string } | null
}

interface ServiceOption { id: string; name: string; price_ngn: number }
interface StaffOption   { id: string; name: string }

type FilterTab = 'today' | 'upcoming' | 'all'

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-[#1e1e1e] text-[#888] border-[#2a2a2a]',
  pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  no_show:   'bg-red-500/10 text-red-400 border-red-500/20',
}

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show',   label: 'No Show' },
]

const TIME_SLOTS = [
  { label: '9:00 AM',  value: '09:00' },
  { label: '10:00 AM', value: '10:00' },
  { label: '11:00 AM', value: '11:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '1:00 PM',  value: '13:00' },
  { label: '2:00 PM',  value: '14:00' },
  { label: '3:00 PM',  value: '15:00' },
  { label: '4:00 PM',  value: '16:00' },
  { label: '5:00 PM',  value: '17:00' },
  { label: '6:00 PM',  value: '18:00' },
]

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }),
    time: d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos' }),
  }
}

export default function AppointmentsPage() {
  const router = useRouter()
  const [ready, setReady]       = useState(false)
  const [appts, setAppts]       = useState<ApptRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<FilterTab>('today')
  const [services, setServices] = useState<ServiceOption[]>([])
  const [staff, setStaff]       = useState<StaffOption[]>([])

  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [statusMenu, setStatusMenu] = useState<string | null>(null)

  // New appointment modal
  const [showNew, setShowNew]       = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [apptDate, setApptDate]     = useState('')
  const [timeValue, setTimeValue]   = useState('')
  const [timeLabel, setTimeLabel]   = useState('')
  const [selectedSvcs, setSelectedSvcs] = useState<string[]>([])
  const [newLoading, setNewLoading] = useState(false)
  const [newError, setNewError]     = useState('')

  // Check-in modal
  const [checkInAppt, setCheckInAppt]         = useState<ApptRow | null>(null)
  const [checkInStaffId, setCheckInStaffId]   = useState('')
  const [checkInServiceIds, setCheckInServiceIds] = useState<string[]>([])
  const [checkInTip, setCheckInTip]                 = useState('')
  const [checkInPayment, setCheckInPayment]         = useState<'cash' | 'transfer' | 'pos'>('cash')
  const [checkInLoading, setCheckInLoading]         = useState(false)
  const [checkInError, setCheckInError]             = useState('')
  const [checkInSuccess, setCheckInSuccess]         = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/login'); return }
    setReady(true)
    Promise.all([
      fetch('/api/manager/services').then(r => r.ok ? r.json() : { services: [] }),
      fetch('/api/manager/staff').then(r => r.ok ? r.json() : { staff: [] }),
    ]).then(([sData, stData]) => {
      setServices(sData.services ?? [])
      setStaff((stData.staff ?? []).filter((m: StaffOption & { is_active: boolean }) => m.is_active))
    }).catch(() => {})
  }, [router])

  useEffect(() => {
    if (!ready) return
    setLoading(true)
    fetch(`/api/manager/appointments?filter=${filter}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAppts(data); setLoading(false) })
      .catch(() => { setAppts([]); setLoading(false) })
  }, [filter, ready])

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    setStatusMenu(null)
    try {
      await fetch(`/api/manager/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    } finally {
      setUpdatingId(null)
    }
  }

  async function submitCheckIn(e: React.FormEvent) {
    e.preventDefault()
    setCheckInError('')
    if (!checkInStaffId) { setCheckInError('Please select a staff member.'); return }
    setCheckInLoading(true)
    try {
      const res = await fetch(`/api/manager/appointments/${checkInAppt!.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: checkInStaffId, serviceIds: checkInServiceIds, tipNgn: checkInTip, paymentMethod: checkInPayment }),
      })
      const data = await res.json()
      if (!res.ok) { setCheckInError(data.error ?? 'Failed to check in.'); return }
      setCheckInSuccess(true)
      // Mark as completed in list
      setAppts(prev => prev.map(a => a.id === checkInAppt!.id ? { ...a, status: 'completed' } : a))
      setTimeout(() => { setCheckInAppt(null); setCheckInSuccess(false); setCheckInStaffId(''); setCheckInServiceIds([]); setCheckInTip(''); setCheckInPayment('cash') }, 1500)
    } catch {
      setCheckInError('Connection error. Try again.')
    } finally {
      setCheckInLoading(false)
    }
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault()
    setNewError('')
    if (!clientName || !clientPhone || !apptDate || !timeValue || !selectedSvcs.length) {
      setNewError('Please fill in all fields and select at least one service.')
      return
    }
    setNewLoading(true)
    try {
      const res = await fetch('/api/manager/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, clientPhone, date: apptDate, timeValue, timeLabel, serviceIds: selectedSvcs }),
      })
      const data = await res.json()
      if (!res.ok) { setNewError(data.error ?? 'Failed to create appointment.'); return }
      setShowNew(false)
      setClientName(''); setClientPhone(''); setApptDate(''); setTimeValue(''); setTimeLabel(''); setSelectedSvcs([])
      setLoading(true)
      fetch(`/api/manager/appointments?filter=${filter}`)
        .then(r => r.ok ? r.json() : [])
        .then(d => { setAppts(d); setLoading(false) })
        .catch(() => setLoading(false))
    } catch {
      setNewError('Connection error. Try again.')
    } finally {
      setNewLoading(false)
    }
  }

  function toggleService(id: string) {
    setSelectedSvcs(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-[#555] text-sm mt-0.5">View and manage all bookings</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 bg-white text-gray-950 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-100 active:scale-[0.98] transition-all w-fit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Appointment
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[#141414] border border-[#1e1e1e] rounded-xl p-1 mb-6 w-fit">
        {(['today', 'upcoming', 'all'] as FilterTab[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f ? 'bg-white text-gray-950' : 'text-[#666] hover:text-white'
            }`}>
            {f === 'today' ? 'Today' : f === 'upcoming' ? 'Upcoming' : 'All'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3].map(i => <div key={i} className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-20 animate-pulse" />)}
        </div>
      ) : appts.length === 0 ? (
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl px-4 py-16 text-center">
          <p className="text-[#555] text-sm">No appointments {filter === 'today' ? 'today' : filter === 'upcoming' ? 'coming up' : 'found'}.</p>
          <p className="text-[#333] text-sm mt-1">Tap &quot;New Appointment&quot; to create one.</p>
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden divide-y divide-[#1e1e1e]">
          {appts.map(a => {
            const { date, time } = fmtDateTime(a.scheduled_at)
            const svcNames = a.appointment_services.map(s => s.services?.name ?? '').filter(Boolean).join(', ') || '—'
            const canCheckIn = a.status === 'pending' || a.status === 'confirmed'
            return (
              <div key={a.id} className="px-4 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-semibold">{a.clients?.name ?? '—'}</p>
                    {a.clients?.phone && <><span className="text-[#444] text-xs">·</span><p className="text-[#555] text-xs">{a.clients.phone}</p></>}
                  </div>
                  <p className="text-[#888] text-xs mt-1">{svcNames}</p>
                  <p className="text-[#555] text-xs mt-0.5">
                    {date} · {time}{a.users?.name ? ` · ${a.users.name}` : ''}
                  </p>
                </div>
                {/* Status badge — always in the middle */}
                <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setStatusMenu(prev => prev === a.id ? null : a.id)}
                      disabled={updatingId === a.id}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border capitalize transition-all ${
                        STATUS_STYLES[a.status] ?? STATUS_STYLES.pending
                      } ${updatingId === a.id ? 'opacity-50' : 'cursor-pointer hover:opacity-80'}`}
                    >
                      {a.status.replace('_', ' ')} <span className="opacity-60">▾</span>
                    </button>
                    {statusMenu === a.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden z-10 min-w-[140px] shadow-xl">
                        {STATUS_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => updateStatus(a.id, opt.value)}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#222] ${
                              a.status === opt.value ? 'text-white font-semibold' : 'text-[#888]'
                            }`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                {/* Check In button — rightmost */}
                {canCheckIn && (
                  <button
                    onClick={() => {
                        setCheckInAppt(a)
                        setCheckInStaffId('')
                        setCheckInServiceIds(a.appointment_services.map(s => s.service_id))
                        setCheckInTip('')
                        setCheckInPayment('cash')
                        setCheckInError('')
                        setCheckInSuccess(false)
                      }}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-white text-gray-950 font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-gray-100 active:scale-[0.98] transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Check In
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {statusMenu && <div className="fixed inset-0 z-0" onClick={() => setStatusMenu(null)} />}

      {/* Check-in Modal */}
      {checkInAppt && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => { if (!checkInLoading) setCheckInAppt(null) }}>
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1e1e1e] flex-shrink-0">
              <div>
                <h2 className="text-white font-semibold text-sm">Client Arrived</h2>
                <p className="text-[#555] text-xs mt-0.5">{checkInAppt.clients?.name}</p>
              </div>
              <button onClick={() => setCheckInAppt(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#555] hover:text-white hover:bg-[#1e1e1e] transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {checkInSuccess ? (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-emerald-400 font-semibold">Checked in successfully.</p>
                <p className="text-[#555] text-xs mt-1">Visit recorded and commission tracked.</p>
              </div>
            ) : (
              <form onSubmit={submitCheckIn} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                {/* Services */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#888] text-xs font-medium">Services</label>
                    {checkInServiceIds.length > 0 && (
                      <span className="text-[#C49A3C] text-xs font-semibold tabular-nums">
                        {fmtNaira(services.filter(s => checkInServiceIds.includes(s.id)).reduce((sum, s) => sum + s.price_ngn, 0))}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {services.map(s => {
                      const selected = checkInServiceIds.includes(s.id)
                      return (
                        <button type="button" key={s.id}
                          onClick={() => setCheckInServiceIds(prev =>
                            prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                          )}
                          className={`text-left px-3 py-2 rounded-lg border transition-all ${
                            selected
                              ? 'bg-white border-white text-gray-950'
                              : 'bg-[#141414] border-[#2a2a2a] text-[#888] hover:border-[#3a3a3a]'
                          }`}>
                          <p className="text-xs font-medium leading-tight">{s.name}</p>
                          <p className={`text-[11px] mt-0.5 tabular-nums ${selected ? 'text-gray-600' : 'text-[#555]'}`}>
                            ₦{s.price_ngn.toLocaleString()}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Staff — dropdown */}
                <div>
                  <label className="block text-[#888] text-xs font-medium mb-1.5">Staff Member</label>
                  <select
                    value={checkInStaffId}
                    onChange={e => setCheckInStaffId(e.target.value)}
                    className="input"
                    required>
                    <option value="">Select staff member…</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Payment method */}
                <div>
                  <label className="block text-[#888] text-xs font-medium mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'cash',     label: 'Cash' },
                      { value: 'transfer', label: 'Transfer' },
                      { value: 'pos',      label: 'POS' },
                    ] as const).map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setCheckInPayment(opt.value)}
                        className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                          checkInPayment === opt.value
                            ? 'bg-white border-white text-gray-950'
                            : 'bg-[#141414] border-[#2a2a2a] text-[#888] hover:border-[#3a3a3a] hover:text-white'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tip */}
                <div>
                  <label className="block text-[#888] text-xs font-medium mb-1.5">
                    Tip <span className="text-[#555] font-normal">(optional)</span>
                  </label>
                  <div className="relative max-w-[160px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">₦</span>
                    <input
                      type="text" inputMode="numeric"
                      value={checkInTip}
                      onChange={e => setCheckInTip(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className="input pl-7"
                    />
                  </div>
                </div>

                {checkInError && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2.5">
                    <p className="text-red-400 text-xs">{checkInError}</p>
                  </div>
                )}

                <button type="submit" disabled={checkInLoading || !checkInStaffId || checkInServiceIds.length === 0}
                  className="w-full bg-white text-gray-950 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-40">
                  {checkInLoading ? 'Checking in…' : 'Confirm Check-In'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowNew(false)}>
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#1e1e1e]">
              <h2 className="text-white font-semibold">New Appointment</h2>
              <button onClick={() => setShowNew(false)} className="text-[#555] hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitNew} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#888] text-xs font-medium mb-1.5">Client Name</label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)}
                    placeholder="Full name" required className="input" />
                </div>
                <div>
                  <label className="block text-[#888] text-xs font-medium mb-1.5">Phone Number</label>
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="08012345678" inputMode="numeric" required className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#888] text-xs font-medium mb-1.5">Date</label>
                  <input type="date" min={todayStr} value={apptDate}
                    onChange={e => setApptDate(e.target.value)} required className="input" />
                </div>
                <div>
                  <label className="block text-[#888] text-xs font-medium mb-1.5">Time</label>
                  <select value={timeValue}
                    onChange={e => {
                      const opt = TIME_SLOTS.find(t => t.value === e.target.value)
                      setTimeValue(e.target.value)
                      setTimeLabel(opt?.label ?? '')
                    }}
                    required className="input">
                    <option value="">Select time</option>
                    {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#888] text-xs font-medium mb-2">Services</label>
                <div className="grid grid-cols-2 gap-2">
                  {services.map(s => {
                    const sel = selectedSvcs.includes(s.id)
                    return (
                      <button type="button" key={s.id} onClick={() => toggleService(s.id)}
                        className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                          sel ? 'bg-[#C49A3C]/10 border-[#C49A3C]/50 text-[#C49A3C]'
                              : 'bg-[#141414] border-[#2a2a2a] text-[#888] hover:border-[#3a3a3a]'
                        }`}>
                        <p className="font-medium leading-tight">{s.name}</p>
                        <p className="text-xs opacity-60 mt-0.5">₦{s.price_ngn.toLocaleString()}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {newError && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{newError}</p>
                </div>
              )}

              <button type="submit" disabled={newLoading}
                className="w-full bg-white text-gray-950 font-semibold py-3 rounded-xl text-sm hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-40">
                {newLoading ? 'Creating…' : 'Create Appointment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
