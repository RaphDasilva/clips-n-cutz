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
}

interface ServiceOption { id: string; name: string; price_ngn: number }

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

  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [statusMenu, setStatusMenu] = useState<string | null>(null)

  const [showNew, setShowNew]       = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [apptDate, setApptDate]     = useState('')
  const [timeValue, setTimeValue]   = useState('')
  const [timeLabel, setTimeLabel]   = useState('')
  const [selectedSvcs, setSelectedSvcs] = useState<string[]>([])
  const [newLoading, setNewLoading] = useState(false)
  const [newError, setNewError]     = useState('')

  // Auth check
  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/login'); return }
    setReady(true)
    fetch('/api/manager/services')
      .then(r => r.ok ? r.json() : [])
      .then(setServices)
      .catch(() => {})
  }, [router])

  // Load appointments when filter changes
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
      // Reset form and reload
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
            return (
              <div key={a.id} className="px-4 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-semibold">{a.clients?.name ?? '—'}</p>
                    {a.clients?.phone && <><span className="text-[#444] text-xs">·</span><p className="text-[#555] text-xs">{a.clients.phone}</p></>}
                  </div>
                  <p className="text-[#888] text-xs mt-1">{svcNames}</p>
                  <p className="text-[#555] text-xs mt-0.5">{date} · {time}</p>
                </div>
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
              </div>
            )
          })}
        </div>
      )}

      {statusMenu && <div className="fixed inset-0 z-0" onClick={() => setStatusMenu(null)} />}

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
