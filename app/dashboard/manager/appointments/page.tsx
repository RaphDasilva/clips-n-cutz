'use client'

import { useState, useEffect } from 'react'
import { getSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import type { Service } from '@/types/database'
import ServicePicker from '@/components/ServicePicker'

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

type ServiceOption = Service
interface StaffOption   { id: string; name: string }

type FilterTab = 'today' | 'upcoming' | 'all'

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-[var(--border)] text-[var(--text-muted)] border-[var(--border-strong)]',
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
  const [checkInAppt, setCheckInAppt]                 = useState<ApptRow | null>(null)
  const [checkInDefaultStaff, setCheckInDefaultStaff] = useState('')
  const [checkInLines, setCheckInLines]               = useState<CheckInLine[]>([])
  const [checkInTipByStaff, setCheckInTipByStaff]     = useState<Record<string, string>>({})
  const [checkInPayment, setCheckInPayment]           = useState<'cash' | 'transfer' | 'pos'>('cash')
  const [checkInLoading, setCheckInLoading]           = useState(false)
  const [checkInError, setCheckInError]               = useState('')
  const [checkInSuccess, setCheckInSuccess]           = useState(false)

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
    if (checkInLines.length === 0) { setCheckInError('Pick at least one service.'); return }
    const unassigned = checkInLines.find(l => !l.staffId)
    if (unassigned) { setCheckInError('Every line needs a staff member.'); return }
    setCheckInLoading(true)
    try {
      const res = await fetch(`/api/manager/appointments/${checkInAppt!.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines:         checkInLines.map(({ serviceId, staffId }) => ({ serviceId, staffId })),
          tipByStaff:    checkInTipByStaff,
          paymentMethod: checkInPayment,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setCheckInError(data.error ?? 'Failed to check in.'); return }
      setCheckInSuccess(true)
      setAppts(prev => prev.map(a => a.id === checkInAppt!.id ? { ...a, status: 'completed' } : a))
      setTimeout(() => {
        setCheckInAppt(null); setCheckInSuccess(false)
        setCheckInDefaultStaff(''); setCheckInLines([])
        setCheckInTipByStaff({}); setCheckInPayment('cash')
      }, 1500)
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
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-[var(--text-dim)] text-sm mt-0.5">View and manage all bookings</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 bg-[var(--text)] text-[var(--bg)] font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all w-fit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Appointment
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1 mb-6 w-fit">
        {(['today', 'upcoming', 'all'] as FilterTab[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f ? 'bg-[var(--text)] text-[var(--bg)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}>
            {f === 'today' ? 'Today' : f === 'upcoming' ? 'Upcoming' : 'All'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-20 animate-pulse" />)}
        </div>
      ) : appts.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-16 text-center">
          <p className="text-[var(--text-dim)] text-sm">No appointments {filter === 'today' ? 'today' : filter === 'upcoming' ? 'coming up' : 'found'}.</p>
          <p className="text-[var(--text-faint)] text-sm mt-1">Tap &quot;New Appointment&quot; to create one.</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
          {appts.map(a => {
            const { date, time } = fmtDateTime(a.scheduled_at)
            const svcNames = a.appointment_services.map(s => s.services?.name ?? '').filter(Boolean).join(', ') || '—'
            const canCheckIn = a.status === 'pending' || a.status === 'confirmed'
            return (
              <div key={a.id} className="px-4 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[var(--text)] text-sm font-semibold">{a.clients?.name ?? '—'}</p>
                    {a.clients?.phone && <><span className="text-[var(--text-faint)] text-xs">·</span><p className="text-[var(--text-dim)] text-xs">{a.clients.phone}</p></>}
                  </div>
                  <p className="text-[var(--text-muted)] text-xs mt-1">{svcNames}</p>
                  <p className="text-[var(--text-dim)] text-xs mt-0.5">
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
                      <div className="absolute right-0 top-full mt-1 bg-[var(--elevated)] border border-[var(--border-strong)] rounded-xl overflow-hidden z-10 min-w-[140px] shadow-xl">
                        {STATUS_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => updateStatus(a.id, opt.value)}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--border-strong)] ${
                              a.status === opt.value ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-muted)]'
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
                        setCheckInDefaultStaff('')
                        setCheckInLines(a.appointment_services.map(s => ({
                          key:       Math.random().toString(36).slice(2) + Date.now().toString(36),
                          serviceId: s.service_id,
                          staffId:   '',
                        })))
                        setCheckInTipByStaff({})
                        setCheckInPayment('cash')
                        setCheckInError('')
                        setCheckInSuccess(false)
                      }}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-[var(--text)] text-[var(--bg)] font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all">
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
          <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border)] flex-shrink-0">
              <div>
                <h2 className="text-[var(--text)] font-semibold text-sm">Client Arrived</h2>
                <p className="text-[var(--text-dim)] text-xs mt-0.5">{checkInAppt.clients?.name}</p>
              </div>
              <button onClick={() => setCheckInAppt(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all">
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
                <p className="text-[var(--text-dim)] text-xs mt-1">Visit recorded and commission tracked.</p>
              </div>
            ) : (
              <CheckInForm
                services={services}
                staff={staff}
                checkInLines={checkInLines}
                setCheckInLines={setCheckInLines}
                checkInTipByStaff={checkInTipByStaff}
                setCheckInTipByStaff={setCheckInTipByStaff}
                checkInDefaultStaff={checkInDefaultStaff}
                setCheckInDefaultStaff={setCheckInDefaultStaff}
                checkInPayment={checkInPayment}
                setCheckInPayment={setCheckInPayment}
                checkInError={checkInError}
                checkInLoading={checkInLoading}
                onSubmit={submitCheckIn}
              />
            )}
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowNew(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
              <h2 className="text-[var(--text)] font-semibold">New Appointment</h2>
              <button onClick={() => setShowNew(false)} className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitNew} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Client Name</label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)}
                    placeholder="Full name" required className="input" />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Phone Number</label>
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="08012345678" inputMode="numeric" required className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Date</label>
                  <input type="date" min={todayStr} value={apptDate}
                    onChange={e => setApptDate(e.target.value)} required className="input" />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Time</label>
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
                <label className="block text-[var(--text-muted)] text-xs font-medium mb-2">Services</label>
                <ServicePicker
                  services={services}
                  selectedIds={selectedSvcs}
                  onChange={setSelectedSvcs}
                  variant="gold"
                  placeholder="+ Add services"
                />
              </div>

              {newError && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{newError}</p>
                </div>
              )}

              <button type="submit" disabled={newLoading}
                className="w-full bg-[var(--text)] text-[var(--bg)] font-semibold py-3 rounded-xl text-sm hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all disabled:opacity-40">
                {newLoading ? 'Creating…' : 'Create Appointment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

interface CheckInLine { key: string; serviceId: string; staffId: string }

interface CheckInFormProps {
  services:               ServiceOption[]
  staff:                  StaffOption[]
  checkInLines:           CheckInLine[]
  setCheckInLines:        React.Dispatch<React.SetStateAction<CheckInLine[]>>
  checkInTipByStaff:      Record<string, string>
  setCheckInTipByStaff:   React.Dispatch<React.SetStateAction<Record<string, string>>>
  checkInDefaultStaff:    string
  setCheckInDefaultStaff: (v: string) => void
  checkInPayment:         'cash' | 'transfer' | 'pos'
  setCheckInPayment:      (v: 'cash' | 'transfer' | 'pos') => void
  checkInError:           string
  checkInLoading:         boolean
  onSubmit:               (e: React.FormEvent) => void
}

function makeKey() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function CheckInForm(props: CheckInFormProps) {
  const {
    services, staff,
    checkInLines, setCheckInLines,
    checkInTipByStaff, setCheckInTipByStaff,
    checkInDefaultStaff, setCheckInDefaultStaff,
    checkInPayment, setCheckInPayment,
    checkInError, checkInLoading, onSubmit,
  } = props

  const serviceById = new Map(services.map(s => [s.id, s]))
  const staffById   = new Map(staff.map(s => [s.id, s]))

  const selectedIds = Array.from(new Set(checkInLines.map(l => l.serviceId)))

  function handlePickerChange(nextIds: string[]) {
    const currentSet = new Set(selectedIds)
    const nextSet    = new Set(nextIds)
    const kept       = checkInLines.filter(l => nextSet.has(l.serviceId))
    const added: CheckInLine[] = nextIds
      .filter(id => !currentSet.has(id))
      .map(serviceId => ({ key: makeKey(), serviceId, staffId: checkInDefaultStaff }))
    setCheckInLines([...kept, ...added])
  }

  function duplicateLine(key: string) {
    setCheckInLines(prev => {
      const idx = prev.findIndex(l => l.key === key)
      if (idx < 0) return prev
      const src = prev[idx]
      const dup: CheckInLine = { key: makeKey(), serviceId: src.serviceId, staffId: src.staffId }
      return [...prev.slice(0, idx + 1), dup, ...prev.slice(idx + 1)]
    })
  }

  function removeLine(key: string) {
    setCheckInLines(prev => prev.filter(l => l.key !== key))
  }

  function setLineStaff(key: string, staffId: string) {
    setCheckInLines(prev => prev.map(l => l.key === key ? { ...l, staffId } : l))
  }

  // Fill any line missing a staff with the new default
  useEffect(() => {
    if (!checkInDefaultStaff) return
    setCheckInLines(prev => {
      let changed = false
      const next = prev.map(l => {
        if (!l.staffId) { changed = true; return { ...l, staffId: checkInDefaultStaff } }
        return l
      })
      return changed ? next : prev
    })
  }, [checkInDefaultStaff, setCheckInLines])

  // Prune tip entries when their staff is no longer involved
  useEffect(() => {
    const involved = new Set(checkInLines.map(l => l.staffId).filter(Boolean))
    setCheckInTipByStaff(prev => {
      const next: Record<string, string> = {}
      for (const sid of involved) if (prev[sid] !== undefined) next[sid] = prev[sid]
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
  }, [checkInLines, setCheckInTipByStaff])

  const involvedStaffIds = Array.from(new Set(checkInLines.map(l => l.staffId).filter(Boolean)))

  const total = checkInLines.reduce(
    (sum, l) => sum + (serviceById.get(l.serviceId)?.price_ngn ?? 0),
    0
  )

  const totalTips = Object.values(checkInTipByStaff)
    .reduce((s, v) => s + (parseInt(v, 10) || 0), 0)

  return (
    <form onSubmit={onSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

      <div>
        <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Default Staff</label>
        <select
          value={checkInDefaultStaff}
          onChange={e => setCheckInDefaultStaff(e.target.value)}
          className="input">
          <option value="">No default — assign each line</option>
          {staff.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[var(--text-muted)] text-xs font-medium">Services</label>
          {total > 0 && (
            <span className="text-[var(--accent)] text-xs font-semibold tabular-nums">
              ₦{total.toLocaleString('en-NG')}
            </span>
          )}
        </div>
        <ServicePicker
          services={services}
          selectedIds={selectedIds}
          onChange={handlePickerChange}
          placeholder="+ Select services"
        />
      </div>

      {checkInLines.length > 0 && (
        <div>
          <label className="block text-[var(--text-muted)] text-xs font-medium mb-2">Who did what</label>
          <div className="space-y-2">
            {checkInLines.map(line => {
              const sv = serviceById.get(line.serviceId)
              if (!sv) return null
              return (
                <div key={line.key} className="flex items-center gap-2 bg-[var(--elevated)] border border-[var(--border)] rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text)] text-sm font-medium truncate">{sv.name}</p>
                    <p className="text-[var(--text-dim)] text-[11px] tabular-nums">₦{sv.price_ngn.toLocaleString('en-NG')}</p>
                  </div>
                  <select value={line.staffId}
                    onChange={e => setLineStaff(line.key, e.target.value)}
                    className={`bg-[var(--card)] border rounded-md px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-[var(--accent)] ${
                      line.staffId ? 'border-[var(--border-strong)] text-[var(--text)]' : 'border-amber-500/40 text-amber-500'
                    }`}>
                    <option value="">Pick…</option>
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
            Tap <span className="text-[var(--accent)]">+</span> to add another of the same service.
          </p>
        </div>
      )}

      <div>
        <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Payment Method</label>
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
                  ? 'bg-[var(--text)] border-[var(--text)] text-[var(--bg)]'
                  : 'bg-[var(--card)] border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--text-faint)] hover:text-[var(--text)]'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {involvedStaffIds.length > 0 && (
        <div>
          <label className="block text-[var(--text-muted)] text-xs font-medium mb-2">
            Tips <span className="text-[var(--text-faint)] font-normal">(optional, per staff)</span>
          </label>
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
                      value={checkInTipByStaff[sid] ?? ''}
                      onChange={e => setCheckInTipByStaff(prev => ({ ...prev, [sid]: e.target.value.replace(/\D/g, '') }))}
                      placeholder="0"
                      className="input pl-7 text-right" />
                  </div>
                </div>
              )
            })}
          </div>
          {totalTips > 0 && (
            <p className="text-[var(--accent)] text-[11px] font-semibold mt-2 text-right tabular-nums">
              Total tips: ₦{totalTips.toLocaleString('en-NG')}
            </p>
          )}
        </div>
      )}

      {checkInError && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2.5">
          <p className="text-red-400 text-xs">{checkInError}</p>
        </div>
      )}

      <button type="submit" disabled={checkInLoading || checkInLines.length === 0}
        className="w-full bg-[var(--text)] text-[var(--bg)] font-semibold py-2.5 rounded-xl text-sm hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all disabled:opacity-40">
        {checkInLoading ? 'Checking in…' : 'Confirm Check-In'}
      </button>
    </form>
  )
}
