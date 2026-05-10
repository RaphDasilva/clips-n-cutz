'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getSession, clearSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface TodayVisit {
  id: string
  total_ngn: number
  created_at: string
  clients: { name: string } | null
}

interface TodayAppointment {
  id: string
  scheduled_at: string
  status: string
  clients: { name: string } | null
}

interface TodayData {
  visitCount: number
  appointmentCount: number
  visits: TodayVisit[]
  appointments: TodayAppointment[]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Lagos',
  })
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`
}

export default function ManagerHome() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const session = getSession()
    if (!session) { router.replace('/login'); return }
    setUser({ name: session.name })

    const res = await fetch('/api/manager/today')
    if (res.ok) {
      const json = await res.json()
      setData(json)
    }
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  function handleLogout() {
    clearSession()
    router.replace('/login')
  }

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Lagos',
  })

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-gray-500 text-sm">{today}</p>
          <h1 className="text-white text-xl font-bold mt-0.5">
            {user ? `Hi, ${user.name.split(' ')[0]}` : 'Dashboard'}
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-500 text-xs border border-gray-800 rounded-lg px-3 py-2 mt-1"
        >
          Log out
        </button>
      </div>

      {/* Quick Action — Walk-in */}
      <Link
        href="/dashboard/manager/walk-in"
        className="flex items-center justify-between bg-white text-gray-950 rounded-2xl px-5 py-4 mb-6 active:scale-[0.98] transition-all"
      >
        <div>
          <p className="font-bold text-base">New Walk-in</p>
          <p className="text-gray-600 text-sm mt-0.5">Log a client visit right now</p>
        </div>
        <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[0, 1].map((i) => (
            <div key={i} className="bg-gray-900 rounded-2xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-1">Walk-ins today</p>
            <p className="text-white text-3xl font-bold">{data?.visitCount ?? 0}</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-1">Appointments</p>
            <p className="text-white text-3xl font-bold">{data?.appointmentCount ?? 0}</p>
          </div>
        </div>
      )}

      {/* Today's Appointments */}
      {!loading && (data?.appointments?.length ?? 0) > 0 && (
        <section className="mb-6">
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Today&apos;s Appointments
          </h2>
          <div className="space-y-2">
            {data!.appointments.map((appt) => (
              <div key={appt.id} className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{appt.clients?.name ?? 'Unknown'}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{formatTime(appt.scheduled_at)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  appt.status === 'confirmed' ? 'bg-green-900/50 text-green-400' :
                  appt.status === 'completed' ? 'bg-gray-800 text-gray-400' :
                  'bg-yellow-900/50 text-yellow-400'
                }`}>
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Walk-ins */}
      {!loading && (data?.visits?.length ?? 0) > 0 && (
        <section className="mb-6">
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Recent Walk-ins
          </h2>
          <div className="space-y-2">
            {data!.visits.slice(0, 5).map((visit) => (
              <div key={visit.id} className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{visit.clients?.name ?? 'Unknown'}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{formatTime(visit.created_at)}</p>
                </div>
                <p className="text-white text-sm font-semibold">{formatNaira(visit.total_ngn)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && data?.visitCount === 0 && data?.appointmentCount === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-sm">No activity today yet.</p>
          <p className="text-gray-700 text-sm mt-1">Tap New Walk-in to get started.</p>
        </div>
      )}
    </div>
  )
}
