'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Service, User } from '@/types/database'

interface StaffMember extends Omit<User, 'pin_hash'> {}

export default function WalkInPage() {
  const router = useRouter()

  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [staffId, setStaffId] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ clientName: string; totalNgn: number; serviceCount: number } | null>(null)

  useEffect(() => {
    async function load() {
      const [svcRes, staffRes] = await Promise.all([
        fetch('/api/manager/services'),
        fetch('/api/manager/staff'),
      ])
      const [svcData, staffData] = await Promise.all([svcRes.json(), staffRes.json()])
      setServices(svcData.services ?? [])
      setStaff((staffData.staff ?? []).filter((s: StaffMember) => s.is_active))
      setLoading(false)
    }
    load()
  }, [])

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const selectedTotal = services
    .filter((s) => selectedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + s.price_ngn, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/manager/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, clientPhone, staffId, serviceIds: selectedServiceIds }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }

      setSuccess({ clientName: data.clientName, totalNgn: data.totalNgn, serviceCount: data.serviceCount })
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleAnother() {
    setClientName('')
    setClientPhone('')
    setStaffId('')
    setSelectedServiceIds([])
    setSuccess(null)
    setError('')
  }

  // Success screen
  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-green-900/30 border border-green-800/50 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold">Visit Logged</h2>
          <p className="text-gray-400 text-sm mt-2">
            {success.clientName} · {success.serviceCount} service{success.serviceCount !== 1 ? 's' : ''}
          </p>
          <p className="text-white text-2xl font-bold mt-3">
            ₦{success.totalNgn.toLocaleString('en-NG')}
          </p>
          <p className="text-gray-600 text-xs mt-2">Follow-up WhatsApp scheduled for 7 days</p>

          <div className="flex flex-col gap-3 mt-8">
            <button
              onClick={handleAnother}
              className="w-full bg-white text-gray-950 font-semibold py-3.5 rounded-xl"
            >
              Log Another Walk-in
            </button>
            <button
              onClick={() => router.push('/dashboard/manager')}
              className="w-full bg-gray-900 text-gray-300 font-medium py-3.5 rounded-xl"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-white text-xl font-bold">New Walk-in</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900 rounded-xl h-14 animate-pulse" />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Client name */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Client Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Emeka Obi"
              required
              autoCapitalize="words"
              className="w-full bg-gray-900 text-white border border-gray-800 rounded-xl px-4 py-3.5 text-base placeholder-gray-600 focus:outline-none focus:border-gray-600"
            />
          </div>

          {/* Client phone */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Phone Number</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="08012345678"
              required
              className="w-full bg-gray-900 text-white border border-gray-800 rounded-xl px-4 py-3.5 text-base placeholder-gray-600 focus:outline-none focus:border-gray-600"
            />
          </div>

          {/* Staff selector */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Staff Member</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              required
              className="w-full bg-gray-900 text-white border border-gray-800 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-gray-600 appearance-none"
            >
              <option value="" disabled>Select staff member</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Services */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Services{' '}
              {selectedServiceIds.length > 0 && (
                <span className="text-white font-semibold">
                  · ₦{selectedTotal.toLocaleString('en-NG')}
                </span>
              )}
            </label>
            <div className="space-y-2">
              {services.map((s) => {
                const selected = selectedServiceIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors text-left ${
                      selected
                        ? 'bg-white text-gray-950 border-white'
                        : 'bg-gray-900 text-white border-gray-800'
                    }`}
                  >
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-sm font-semibold">
                      ₦{s.price_ngn.toLocaleString('en-NG')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800/60 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || selectedServiceIds.length === 0 || !staffId}
            className="w-full bg-white text-gray-950 font-bold py-4 rounded-xl text-base disabled:opacity-40 active:scale-[0.98] transition-all mt-2"
          >
            {submitting ? 'Saving…' : `Log Visit · ₦${selectedTotal.toLocaleString('en-NG')}`}
          </button>
        </form>
      )}
    </div>
  )
}
