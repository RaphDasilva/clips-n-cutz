'use client'

import { useEffect, useState } from 'react'
import type { Service } from '@/types/database'

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

function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA')
}

function maxDateStr() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toLocaleDateString('en-CA')
}

export default function BookPage() {
  const [services, setServices]     = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  const [clientName, setClientName]   = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [date, setDate]               = useState('')
  const [timeSlot, setTimeSlot]       = useState<{ label: string; value: string } | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState<{
    displayDate: string; timeLabel: string; serviceNames: string
  } | null>(null)

  useEffect(() => {
    fetch('/api/public/services')
      .then(r => r.json())
      .then(d => { setServices(d.services ?? []); setLoadingServices(false) })
  }, [])

  function toggleService(id: string) {
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  const selectedTotal = services
    .filter(s => selectedIds.includes(s.id))
    .reduce((sum, s) => sum + s.price_ngn, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!timeSlot) { setError('Please select a time slot.'); return }
    setError(''); setSubmitting(true)

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName, clientPhone, serviceIds: selectedIds,
          date, timeValue: timeSlot.value, timeLabel: timeSlot.label,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setSuccess({ displayDate: data.displayDate, timeLabel: data.timeLabel, serviceNames: data.serviceNames })
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Success screen ─────────────────────────────────────── */
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-white text-2xl font-bold">Booking Confirmed!</h2>
          <p className="text-[#888] text-sm mt-2 leading-relaxed">
            {success.serviceNames}
          </p>
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-4 mt-6 text-left space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-lg">📅</span>
              <span className="text-white text-sm">{success.displayDate}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg">⏰</span>
              <span className="text-white text-sm">{success.timeLabel}</span>
            </div>
          </div>
          <p className="text-[#555] text-xs mt-5 leading-relaxed">
            We&apos;ve sent a WhatsApp confirmation to your number. See you soon!
          </p>
          <p className="text-[#333] text-xs mt-3">
            Need to reschedule? WhatsApp us at{' '}
            <span className="text-[#555]">+2348062510256</span>
          </p>
        </div>
      </div>
    )
  }

  /* ── Form ───────────────────────────────────────────────── */
  return (
    <div className="max-w-lg mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] text-[#C49A3C] font-semibold tracking-wide">CNC</span>
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">Clips N&apos;Cutz</p>
            <p className="text-[#555] text-[11px]">Unisex Salon, Lagos</p>
          </div>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Book an Appointment</h1>
        <p className="text-[#555] text-sm mt-1">Pick your service, date, and time — we&apos;ll confirm on WhatsApp.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Client info */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
          <h2 className="text-white text-sm font-semibold">Your Details</h2>
          <div>
            <label className="block text-[#888] text-xs font-medium mb-1.5">Full Name</label>
            <input type="text" value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="e.g. Emeka Obi"
              required autoCapitalize="words"
              className="input" />
          </div>
          <div>
            <label className="block text-[#888] text-xs font-medium mb-1.5">WhatsApp Number</label>
            <input type="tel" value={clientPhone}
              onChange={e => setClientPhone(e.target.value)}
              placeholder="08012345678"
              required
              className="input" />
            <p className="text-[#444] text-xs mt-1">We&apos;ll send your confirmation here.</p>
          </div>
        </div>

        {/* Service selection */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-sm font-semibold">Select Service</h2>
            {selectedTotal > 0 && (
              <span className="text-[#C49A3C] text-sm font-bold">{fmtNaira(selectedTotal)}</span>
            )}
          </div>
          {loadingServices ? (
            <div className="space-y-2">
              {[0,1,2,3].map(i => (
                <div key={i} className="h-11 bg-[#1a1a1a] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {services.map(s => {
                const on = selectedIds.includes(s.id)
                return (
                  <button key={s.id} type="button" onClick={() => toggleService(s.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${
                      on
                        ? 'bg-[#C49A3C]/10 border-[#C49A3C]/50 text-white'
                        : 'bg-[#1a1a1a] border-[#2a2a2a] text-white hover:border-[#3a3a3a]'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        on ? 'bg-[#C49A3C] border-[#C49A3C]' : 'border-[#444]'
                      }`}>
                        {on && (
                          <svg className="w-2.5 h-2.5 text-[#090909]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${on ? 'text-[#C49A3C]' : 'text-[#888]'}`}>
                      {fmtNaira(s.price_ngn)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
          <h2 className="text-white text-sm font-semibold mb-4">Pick a Date</h2>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            min={tomorrowStr()}
            max={maxDateStr()}
            required
            className="input"
          />
        </div>

        {/* Time */}
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
          <h2 className="text-white text-sm font-semibold mb-4">Pick a Time</h2>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map(slot => {
              const active = timeSlot?.value === slot.value
              return (
                <button key={slot.value} type="button"
                  onClick={() => setTimeSlot(slot)}
                  className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    active
                      ? 'bg-[#C49A3C] border-[#C49A3C] text-[#090909]'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-white hover:border-[#3a3a3a]'
                  }`}>
                  {slot.label}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button type="submit"
          disabled={submitting || !clientName || !clientPhone || !selectedIds.length || !date || !timeSlot}
          className="w-full bg-[#C49A3C] text-[#090909] font-bold py-4 rounded-xl text-sm disabled:opacity-40 hover:bg-[#B8912A] active:scale-[0.98] transition-all">
          {submitting ? 'Booking…' : selectedTotal > 0 ? `Book Appointment · ${fmtNaira(selectedTotal)}` : 'Book Appointment'}
        </button>

        <p className="text-center text-[#444] text-xs pb-4">
          Questions? WhatsApp us at{' '}
          <span className="text-[#666]">+2348062510256</span>
        </p>
      </form>
    </div>
  )
}
