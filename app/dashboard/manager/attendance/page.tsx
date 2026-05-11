'use client'

import { useEffect, useState, useCallback } from 'react'

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

interface RowState {
  timeVal: string
  absent: boolean
  saving: boolean
  saved: boolean
  error: string
}

function calcPenalty(checkedInAt: string | null, dateStr: string, sundayGrace: boolean): number {
  if (!checkedInAt) return 5000
  const isSunday = new Date(dateStr + 'T12:00:00').getDay() === 0
  const [h, m] = checkedInAt.split(':').map(Number)
  const mins = h * 60 + m
  if (isSunday) {
    const deadline = sundayGrace ? 13 * 60 : 12 * 60
    return mins <= deadline ? 0 : 1000
  }
  if (mins <= 9 * 60 + 30) return 0
  if (mins < 12 * 60) return 1000
  return 2000
}

function fmtNaira(n: number) { return `₦${n.toLocaleString('en-NG')}` }

function fmt12h(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos',
  })
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
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const [date, setDate]         = useState(todayStr)
  const [staffAtt, setStaffAtt] = useState<StaffAttRow[]>([])
  const [pending, setPending]   = useState<PendingRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [rows, setRows]         = useState<Record<string, RowState>>({})
  const [confirming, setConfirming] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<string | null>(null)

  const loadData = useCallback(async (d: string) => {
    setLoading(true)
    const res  = await fetch(`/api/manager/attendance?date=${d}`)
    const data = await res.json()
    const list: StaffAttRow[] = data.staff ?? []
    setStaffAtt(list)
    setPending(data.pending ?? [])

    const initial: Record<string, RowState> = {}
    for (const s of list) {
      const rec = s.record
      initial[s.id] = {
        timeVal: rec?.checked_in_at ? rec.checked_in_at.slice(0, 5) : '',
        absent:  rec?.status === 'absent',
        saving:  false,
        saved:   !!rec,
        error:   '',
      }
    }
    setRows(initial)
    setLoading(false)
  }, [])

  useEffect(() => { loadData(date) }, [date, loadData])

  // Auto-poll pending requests every 10 seconds when viewing today
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

  function setRow(id: string, patch: Partial<RowState>) {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function confirm(req: PendingRequest) {
    setConfirming(req.staff_id)
    const res = await fetch('/api/manager/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:       'confirm',
        staffId:      req.staff_id,
        date,
        sundayGrace:  req.sunday_grace,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setPending(p => p.filter(x => x.staff_id !== req.staff_id))
      // Update the staff row to show the confirmed time
      setRow(req.staff_id, {
        timeVal: (data.checked_in_at as string).slice(0, 5),
        absent:  false,
        saved:   true,
        saving:  false,
        error:   '',
      })
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

  async function save(s: StaffAttRow) {
    const r = rows[s.id]
    if (!r) return
    setRow(s.id, { saving: true, error: '' })
    const checkedInAt = r.absent ? null : (r.timeVal || null)
    const res = await fetch('/api/manager/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: s.id, date, checkedInAt, sundayGrace: s.sunday_grace }),
    })
    const data = await res.json()
    if (!res.ok) {
      setRow(s.id, { saving: false, error: data.error ?? 'Failed to save.' })
    } else {
      setRow(s.id, { saving: false, saved: true, error: '' })
    }
  }

  const dayOfWeek    = new Date(date + 'T12:00:00').getDay()
  const isSunday     = dayOfWeek === 0
  const isToday      = date === todayStr
  const workingStaff = staffAtt.filter(s => !s.off_days.includes(dayOfWeek))

  const totalPenalty = Object.entries(rows).reduce((sum, [id, r]) => {
    const s = staffAtt.find(x => x.id === id)
    if (!r.saved || !s || s.off_days.includes(dayOfWeek)) return sum
    const checkedInAt = r.absent ? null : (r.timeVal || null)
    return sum + calcPenalty(checkedInAt, date, s.sunday_grace)
  }, 0)

  const savedCount = Object.entries(rows).filter(([id, r]) => {
    const s = staffAtt.find(x => x.id === id)
    return r.saved && s && !s.off_days.includes(dayOfWeek)
  }).length

  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-[#555] text-sm mt-0.5">Mark who showed up and when</p>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setDate(shiftDate(date, -1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#3a3a3a] transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <p className="text-white font-semibold text-sm">{fmtDate(date)}</p>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            {isToday && <span className="text-[#C49A3C] text-xs font-medium">Today</span>}
            {isSunday && (
              <span className="text-[#6366f1] text-xs font-medium">
                {isToday && '· '}Sunday — opens 12pm
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setDate(shiftDate(date, 1))} disabled={date >= todayStr}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#3a3a3a] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* ── Pending check-in requests (today only) ── */}
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
                    <span className="text-amber-400 text-xs font-semibold">{req.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">{req.name}</p>
                    <p className="text-[#666] text-xs">Tapped at {fmt12h(req.requested_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => dismiss(req)}
                    disabled={dismissing === req.staff_id || confirming === req.staff_id}
                    className="text-[#666] hover:text-red-400 text-xs border border-[#2a2a2a] hover:border-red-500/30 rounded-lg px-3 py-1.5 transition-all disabled:opacity-40"
                  >
                    {dismissing === req.staff_id ? 'Dismissing…' : 'Dismiss'}
                  </button>
                  <button
                    onClick={() => confirm(req)}
                    disabled={confirming === req.staff_id || dismissing === req.staff_id}
                    className="bg-white text-gray-950 font-semibold text-xs px-4 py-1.5 rounded-lg hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    {confirming === req.staff_id ? 'Confirming…' : 'Confirm'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[#444] text-xs mt-2 px-1">
            The time recorded will be when you tap Confirm — not when they tapped.
          </p>
        </div>
      )}

      {/* Summary strip */}
      {!loading && savedCount > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3">
            <p className="text-[#555] text-xs mb-1">Recorded</p>
            <p className="text-white text-lg font-bold">{savedCount} / {workingStaff.length}</p>
          </div>
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3">
            <p className="text-[#555] text-xs mb-1">Total Penalties</p>
            <p className={`text-lg font-bold tabular-nums ${totalPenalty > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {totalPenalty > 0 ? fmtNaira(totalPenalty) : 'None'}
            </p>
          </div>
        </div>
      )}

      {/* Rules reminder */}
      <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-5 py-3.5 mb-6">
        {isSunday ? (
          <p className="text-[#666] text-xs leading-relaxed">
            <span className="text-[#888] font-medium">Sunday rules —</span>{' '}
            On time = by 12pm (no penalty). After 12pm = ₦1,000. Absent = ₦5,000.
            Staff with <span className="text-[#6366f1]">Sunday Grace</span> have until 1pm.
          </p>
        ) : (
          <p className="text-[#666] text-xs leading-relaxed">
            <span className="text-[#888] font-medium">Mon–Sat rules —</span>{' '}
            On time = by 9:30am (no penalty). 9:31am–11:59am = ₦1,000. 12pm or later = ₦2,000. Absent = ₦5,000.
          </p>
        )}
      </div>

      {/* Staff rows */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-[76px] animate-pulse" />
          ))}
        </div>
      ) : staffAtt.length === 0 ? (
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-12 text-center">
          <p className="text-[#444] text-sm">No active staff found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {staffAtt.map(s => {
            const r          = rows[s.id]
            if (!r) return null
            const isOffDay    = s.off_days.includes(dayOfWeek)
            const checkedInAt = r.absent ? null : (r.timeVal || null)
            const penalty     = calcPenalty(checkedInAt, date, s.sunday_grace)
            const canSave     = r.absent || r.timeVal.length > 0

            if (isOffDay) {
              return (
                <div key={s.id} className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 lg:px-5 py-4 opacity-40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">{s.name.charAt(0)}</span>
                      </div>
                      <p className="text-white text-sm font-medium">{s.name}</p>
                    </div>
                    <span className="text-[#555] text-xs font-medium border border-[#2a2a2a] rounded-full px-3 py-1">
                      Day off
                    </span>
                  </div>
                </div>
              )
            }

            return (
              <div key={s.id} className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 lg:px-5 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-3 lg:w-40 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">{s.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{s.name}</p>
                      {s.sunday_grace && (
                        <span className="text-[10px] font-medium text-[#6366f1] bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-full px-1.5 py-0.5">
                          Sun. Grace
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => setRow(s.id, { absent: !r.absent, timeVal: '', saved: false })}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        r.absent
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#3a3a3a]'
                      }`}
                    >
                      Absent
                    </button>

                    {!r.absent && (
                      <input
                        type="time"
                        value={r.timeVal}
                        onChange={e => setRow(s.id, { timeVal: e.target.value, saved: false })}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#444] w-[120px] flex-shrink-0"
                      />
                    )}

                    <div className="flex-1 text-right min-w-0">
                      {canSave ? (
                        <span className={`text-sm font-semibold tabular-nums ${
                          penalty === 0 ? 'text-emerald-400' : penalty === 5000 ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {penalty === 0 ? 'On time' : penalty === 5000 ? 'Absent — ₦5,000' : `-${fmtNaira(penalty)}`}
                        </span>
                      ) : (
                        <span className="text-[#333] text-xs">Enter time or mark absent</span>
                      )}
                    </div>

                    <button
                      onClick={() => save(s)}
                      disabled={r.saving || !canSave}
                      className="flex-shrink-0 bg-white text-gray-950 font-semibold text-xs px-4 py-2 rounded-lg hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {r.saving ? 'Saving…' : r.saved ? 'Update' : 'Save'}
                    </button>
                  </div>
                </div>

                {r.error && <p className="text-red-400 text-xs mt-2 pl-11">{r.error}</p>}

                {r.saved && canSave && (
                  <div className="mt-2 pl-11 flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      penalty === 0
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : penalty === 5000
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {penalty === 0 ? 'On time' : penalty === 5000 ? 'Absent' : 'Late'}
                    </span>
                    {penalty > 0 && (
                      <span className="text-[#555] text-[10px]">₦{penalty.toLocaleString('en-NG')} deducted</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
