'use client'

import { useEffect, useState, useCallback } from 'react'
import { useClientMask } from '@/lib/demo-mode'

interface StaffAttRow {
  id: string
  name: string
  sunday_grace: boolean
  off_days: number[]
  record: {
    checked_in_at: string | null
    status: string
    penalty_ngn: number
  } | null
}

interface PendingRequest {
  staff_id: string
  name: string
  sunday_grace: boolean
  off_days: number[]
  requested_at: string
}

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }

function fmt12h(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos',
  })
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${suffix}`
}

function shiftDate(d: string, delta: number) {
  const dt = new Date(d + 'T12:00:00')
  dt.setDate(dt.getDate() + delta)
  return dt.toLocaleDateString('en-CA')
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function AttendancePage() {
  const mask = useClientMask()
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const [date, setDate]         = useState(todayStr)
  const [staffAtt, setStaffAtt] = useState<StaffAttRow[]>([])
  const [pending, setPending]   = useState<PendingRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<string | null>(null)

  const loadData = useCallback(async (d: string) => {
    setLoading(true)
    const res  = await fetch(`/api/manager/attendance?date=${d}`)
    const data = await res.json()
    setStaffAtt(data.staff  ?? [])
    setPending(data.pending ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData(date) }, [date, loadData])

  // Auto-poll pending every 10 seconds when viewing today
  useEffect(() => {
    if (date !== todayStr) return
    const id = setInterval(async () => {
      const res = await fetch(`/api/manager/attendance?date=${date}`)
      if (res.ok) {
        const d = await res.json()
        setPending(d.pending ?? [])
      }
    }, 10_000)
    return () => clearInterval(id)
  }, [date, todayStr])

  async function confirm(req: PendingRequest) {
    setConfirming(req.staff_id)
    const res = await fetch('/api/manager/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', staffId: req.staff_id, date, sundayGrace: req.sunday_grace }),
    })
    const data = await res.json()
    if (res.ok) {
      setPending(p => p.filter(x => x.staff_id !== req.staff_id))
      // Update the staff row with the confirmed record
      setStaffAtt(prev => prev.map(s =>
        s.id === req.staff_id
          ? { ...s, record: { checked_in_at: data.checked_in_at, status: data.status, penalty_ngn: data.penalty_ngn } }
          : s
      ))
    }
    setConfirming(null)
  }

  async function dismiss(req: PendingRequest) {
    setDismissing(req.staff_id)
    const res = await fetch('/api/manager/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', staffId: req.staff_id, date }),
    })
    if (res.ok) setPending(p => p.filter(x => x.staff_id !== req.staff_id))
    setDismissing(null)
  }

  const dayOfWeek    = new Date(date + 'T12:00:00').getDay()
  const isSunday     = dayOfWeek === 0
  const isToday      = date === todayStr
  const workingStaff = staffAtt.filter(s => !s.off_days.includes(dayOfWeek))

  const presentCount = workingStaff.filter(s => s.record && s.record.status !== 'absent').length
  const absentCount  = workingStaff.filter(s => s.record?.status === 'absent').length
  const totalPenalty = workingStaff.reduce((sum, s) => sum + (s.record?.penalty_ngn ?? 0), 0)

  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-[var(--text-dim)] text-sm mt-0.5">
          Staff check in themselves · absences marked automatically at 3pm
        </p>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setDate(shiftDate(date, -1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-faint)] transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <p className="text-[var(--text)] font-semibold text-sm">{fmtDate(date)}</p>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            {isToday && <span className="text-[var(--accent)] text-xs font-medium">Today</span>}
            {isSunday && <span className="text-[#6366f1] text-xs font-medium">{isToday && '· '}Sunday — opens 12pm</span>}
          </div>
        </div>
        <button onClick={() => setDate(shiftDate(date, 1))} disabled={date >= todayStr}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-faint)] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Pending check-in requests */}
      {isToday && !loading && pending.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">
              Waiting for confirmation — {pending.length}
            </p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden divide-y divide-amber-500/10">
            {pending.map(req => (
              <div key={req.staff_id} className="flex items-center justify-between px-4 py-3.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-400 text-xs font-semibold">{mask.name(req.name).charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[var(--text)] text-sm font-medium">{mask.name(req.name)}</p>
                    <p className="text-[var(--text-muted)] text-xs">Tapped at {fmt12h(req.requested_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => dismiss(req)}
                    disabled={dismissing === req.staff_id || confirming === req.staff_id}
                    className="text-[var(--text-muted)] hover:text-red-400 text-xs border border-[var(--border-strong)] hover:border-red-500/30 rounded-lg px-3 py-1.5 transition-all disabled:opacity-40">
                    {dismissing === req.staff_id ? 'Dismissing…' : 'Dismiss'}
                  </button>
                  <button onClick={() => confirm(req)}
                    disabled={confirming === req.staff_id || dismissing === req.staff_id}
                    className="bg-[var(--text)] text-[var(--bg)] font-semibold text-xs px-4 py-1.5 rounded-lg hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all disabled:opacity-40">
                    {confirming === req.staff_id ? 'Confirming…' : 'Confirm'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[var(--text-faint)] text-xs mt-2 px-1">
            Time recorded is when you tap Confirm — not when they tapped.
          </p>
        </div>
      )}

      {/* Summary strip */}
      {!loading && workingStaff.some(s => s.record) && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3">
            <p className="text-[var(--text-dim)] text-xs mb-1">Present</p>
            <p className="text-emerald-400 text-lg font-bold">{presentCount} / {workingStaff.length}</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3">
            <p className="text-[var(--text-dim)] text-xs mb-1">Absent</p>
            <p className={`text-lg font-bold ${absentCount > 0 ? 'text-red-400' : 'text-[var(--text-faint)]'}`}>{absentCount}</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3">
            <p className="text-[var(--text-dim)] text-xs mb-1">Total Penalties</p>
            <p className={`text-lg font-bold tabular-nums ${totalPenalty > 0 ? 'text-red-400' : 'text-[var(--text-faint)]'}`}>
              {totalPenalty > 0 ? fmtNaira(totalPenalty) : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Staff list — read only */}
      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {staffAtt.map(s => {
            const isOffDay = s.off_days.includes(dayOfWeek)

            if (isOffDay) {
              return (
                <div key={s.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3.5 opacity-40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={mask.name(s.name)} />
                    <p className="text-[var(--text)] text-sm font-medium">{mask.name(s.name)}</p>
                  </div>
                  <span className="text-[var(--text-dim)] text-xs border border-[var(--border-strong)] rounded-full px-3 py-1">Day off</span>
                </div>
              )
            }

            const rec = s.record

            return (
              <div key={s.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={mask.name(s.name)} />
                  <div className="min-w-0">
                    <p className="text-[var(--text)] text-sm font-medium">{mask.name(s.name)}</p>
                    {s.sunday_grace && (
                      <span className="text-[10px] text-[#6366f1]">Sun. Grace</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {rec ? (
                    <>
                      {rec.checked_in_at && (
                        <span className="text-[var(--text-dim)] text-xs tabular-nums hidden sm:block">
                          {fmtTime(rec.checked_in_at)}
                        </span>
                      )}
                      {rec.penalty_ngn > 0 && (
                        <span className="text-red-400 text-xs font-medium tabular-nums">
                          -{fmtNaira(rec.penalty_ngn)}
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                        rec.status === 'on_time'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : rec.status === 'late'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {rec.status === 'on_time' ? 'On time' : rec.status === 'late' ? 'Late' : 'Absent'}
                      </span>
                    </>
                  ) : (
                    <span className="text-[var(--text-faint)] text-xs">
                      {isToday ? 'Not yet' : 'Not recorded'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--border)] border border-[var(--border-strong)] flex items-center justify-center flex-shrink-0">
      <span className="text-[var(--text)] text-xs font-semibold">{name.charAt(0)}</span>
    </div>
  )
}
