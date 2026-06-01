'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Service } from '@/types/database'
import ServicePicker from '@/components/ServicePicker'

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

function lagosToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }

export default function StaffBookPage() {
  const router = useRouter()

  const [services, setServices]   = useState<Service[]>([])
  const [loading, setLoading]     = useState(true)

  const [clientName, setClientName]   = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [date, setDate]               = useState(lagosToday())
  const [timeValue, setTimeValue]     = useState('')
  const [timeLabel, setTimeLabel]     = useState('')
  const [selectedSvcs, setSelectedSvcs] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)

  useEffect(() => {
    fetch('/api/manager/services')
      .then(r => r.json())
      .then(j => setServices(j.services ?? []))
      .finally(() => setLoading(false))
  }, [])

  const totalNgn = selectedSvcs.reduce((sum, id) => {
    const s = services.find(s => s.id === id)
    return sum + (s?.price_ngn ?? 0)
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!clientName || !clientPhone || !date || !timeValue || !selectedSvcs.length) {
      setError('Fill in client name, phone, date, time and at least one service.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/staff/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, clientPhone, date, timeValue, timeLabel, serviceIds: selectedSvcs }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to book.'); return }
      setSuccess(true)
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setClientName(''); setClientPhone('')
    setDate(lagosToday()); setTimeValue(''); setTimeLabel('')
    setSelectedSvcs([])
    setSuccess(false); setError('')
  }

  if (success) {
    return (
      <div className="px-6 lg:px-10 py-12 max-w-md mx-auto">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-[var(--text)] text-xl font-bold">Appointment Booked</h2>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            {clientName} &middot; {timeLabel || timeValue}
          </p>
          <p className="text-[var(--text-dim)] text-xs mt-1">
            A confirmation message has been sent to {clientPhone}.
          </p>
          <div className="flex gap-2 mt-6">
            <button onClick={reset}
              className="flex-1 bg-[var(--text)] text-[var(--bg)] font-semibold py-2.5 rounded-xl text-sm">
              Book Another
            </button>
            <button onClick={() => router.push('/dashboard/staff')}
              className="flex-1 bg-[var(--elevated)] border border-[var(--border-strong)] text-[var(--text-muted)] font-medium py-2.5 rounded-xl text-sm">
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-2xl mx-auto">

      <div className="mb-6">
        <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Book Appointment</h1>
        <p className="text-[var(--text-dim)] text-sm mt-0.5">
          The client is automatically assigned to you. A confirmation message is sent on submit.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-5">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Client Name</label>
            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
              placeholder="e.g. Halima Bello" required
              className="input" />
          </div>
          <div>
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Phone Number</label>
            <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="0803 000 0000" required
              className="input" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Date</label>
            <input type="date" value={date} min={lagosToday()}
              onChange={e => setDate(e.target.value)}
              required className="input" />
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
              <option value="">Pick a time…</option>
              {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[var(--text-muted)] text-xs font-medium">Services</label>
            {totalNgn > 0 && (
              <span className="text-[var(--accent)] text-xs font-semibold tabular-nums">{fmtNaira(totalNgn)}</span>
            )}
          </div>
          {loading ? (
            <div className="h-12 bg-[var(--elevated)] rounded-lg animate-pulse" />
          ) : (
            <ServicePicker
              services={services}
              selectedIds={selectedSvcs}
              onChange={setSelectedSvcs}
              placeholder="+ Select services"
            />
          )}
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full bg-[var(--text)] text-[var(--bg)] font-semibold py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all">
          {submitting ? 'Booking…' : 'Book Appointment'}
        </button>
      </form>
    </div>
  )
}
