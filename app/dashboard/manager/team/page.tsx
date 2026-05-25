'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import type { User, Service } from '@/types/database'

type StaffMember = Omit<User, 'pin_hash'> & { serviceIds: string[]; categories: string[] }

export default function TeamPage() {
  const [staff, setStaff]             = useState<StaffMember[]>([])
  const [services, setServices]       = useState<Service[]>([])
  const [loading, setLoading]         = useState(true)

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    for (const s of services) if (s.category) set.add(s.category)
    return Array.from(set)
  }, [services])
  const [showAdd, setShowAdd]         = useState(false)
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null)
  const [servicesTarget, setServicesTarget] = useState<StaffMember | null>(null)
  const [toggling, setToggling]             = useState<string | null>(null)
  const [togglingSunday, setTogglingSunday] = useState<string | null>(null)

  // Add form
  const [newName, setNewName]         = useState('')
  const [newPhone, setNewPhone]       = useState('')
  const [newPIN, setNewPIN]           = useState('')
  const [addError, setAddError]       = useState('')
  const [addLoading, setAddLoading]   = useState(false)

  // Reset PIN
  const [resetPIN, setResetPIN]       = useState('')
  const [resetError, setResetError]   = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // Edit categories (replaces previous per-service edit)
  const [editCategories, setEditCategories] = useState<string[]>([])
  const [editLoading, setEditLoading]       = useState(false)
  const [editError, setEditError]           = useState('')

  // Edit off-days
  const [daysTarget, setDaysTarget]   = useState<StaffMember | null>(null)
  const [daysOff, setDaysOff]         = useState<number[]>([])
  const [daysLoading, setDaysLoading] = useState(false)
  const [daysError, setDaysError]     = useState('')

  // New staff off-days picker
  const [newOffDays, setNewOffDays]   = useState<number[]>([])

  const loadStaff = useCallback(async () => {
    const [sRes, svRes] = await Promise.all([
      fetch('/api/manager/staff'),
      fetch('/api/manager/services'),
    ])
    const [sData, svData] = await Promise.all([sRes.json(), svRes.json()])
    setStaff(sData.staff ?? [])
    setServices(svData.services ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])

  async function toggleSundayGrace(m: StaffMember) {
    setTogglingSunday(m.id)
    const res = await fetch(`/api/manager/staff/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle-sunday-grace' }),
    })
    if (res.ok) {
      const { sunday_grace } = await res.json()
      setStaff(p => p.map(s => s.id === m.id ? { ...s, sunday_grace } : s))
    }
    setTogglingSunday(null)
  }

  async function toggle(m: StaffMember) {
    setToggling(m.id)
    const res = await fetch(`/api/manager/staff/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle' }),
    })
    if (res.ok) {
      const { is_active } = await res.json()
      setStaff(p => p.map(s => s.id === m.id ? { ...s, is_active } : s))
    }
    setToggling(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setAddError(''); setAddLoading(true)
    const res = await fetch('/api/manager/staff', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, phone: newPhone, pin: newPIN, offDays: newOffDays }),
    })
    const data = await res.json()
    if (!res.ok) { setAddError(data.error ?? 'Failed.'); setAddLoading(false); return }
    setStaff(p => [...p, { ...data.staff, serviceIds: [], off_days: data.staff.off_days ?? [] }])
    setNewName(''); setNewPhone(''); setNewPIN(''); setNewOffDays([]); setShowAdd(false); setAddLoading(false)
  }

  async function handleResetPIN(e: React.FormEvent) {
    e.preventDefault(); if (!resetTarget) return; setResetError(''); setResetLoading(true)
    const res = await fetch(`/api/manager/staff/${resetTarget.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-pin', newPIN: resetPIN }),
    })
    const data = await res.json()
    if (!res.ok) { setResetError(data.error ?? 'Failed.'); setResetLoading(false); return }
    setResetPIN(''); setResetTarget(null); setResetLoading(false)
  }

  function openEditDays(m: StaffMember) {
    setDaysTarget(m)
    setDaysOff([...(m.off_days ?? [])])
    setDaysError('')
  }

  async function handleSaveOffDays(e: React.FormEvent) {
    e.preventDefault(); if (!daysTarget) return; setDaysError(''); setDaysLoading(true)
    const res = await fetch(`/api/manager/staff/${daysTarget.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-off-days', offDays: daysOff }),
    })
    const data = await res.json()
    if (!res.ok) { setDaysError(data.error ?? 'Failed.'); setDaysLoading(false); return }
    setStaff(p => p.map(s => s.id === daysTarget.id ? { ...s, off_days: data.off_days } : s))
    setDaysTarget(null); setDaysLoading(false)
  }

  function openEditServices(m: StaffMember) {
    setServicesTarget(m)
    setEditCategories([...(m.categories ?? [])])
    setEditError('')
  }

  function toggleCategory(c: string) {
    setEditCategories(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])
  }

  async function handleSaveServices(e: React.FormEvent) {
    e.preventDefault(); if (!servicesTarget) return; setEditError(''); setEditLoading(true)
    const res = await fetch(`/api/manager/staff/${servicesTarget.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-categories', categories: editCategories }),
    })
    const data = await res.json()
    if (!res.ok) { setEditError(data.error ?? 'Failed.'); setEditLoading(false); return }
    // Recompute serviceIds from selected categories so walk-in filter
    // updates without a refetch.
    const idsByCategory = new Map<string, string[]>()
    for (const s of services) {
      if (!s.category) continue
      const arr = idsByCategory.get(s.category) ?? []
      arr.push(s.id); idsByCategory.set(s.category, arr)
    }
    const nextServiceIds = editCategories.flatMap(c => idsByCategory.get(c) ?? [])
    setStaff(p => p.map(s => s.id === servicesTarget.id
      ? { ...s, categories: editCategories, serviceIds: nextServiceIds }
      : s))
    setServicesTarget(null); setEditLoading(false)
  }

  const active   = staff.filter(s => s.is_active)
  const inactive = staff.filter(s => !s.is_active)

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-[var(--text-dim)] text-sm mt-0.5">{staff.length} staff member{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setShowAdd(true); setAddError('') }}
          className="inline-flex items-center gap-2 bg-[var(--text)] text-[var(--bg)] font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Staff
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-16 animate-pulse" />)}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mb-8">
              <p className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-3">
                Active · {active.length}
              </p>
              {/* Desktop table */}
              <div className="hidden lg:block bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Name</th>
                      <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Services</th>
                      <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Days Off</th>
                      <th className="text-left text-[var(--text-dim)] text-xs font-medium px-5 py-3">Phone</th>
                      <th className="text-right text-[var(--text-dim)] text-xs font-medium px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {active.map(m => (
                      <StaffRow key={m.id} member={m} services={services}
                        onToggle={toggle} onReset={setResetTarget}
                        onEditServices={openEditServices} toggling={toggling === m.id}
                        onToggleSunday={toggleSundayGrace} togglingSunday={togglingSunday === m.id}
                        onEditDays={openEditDays} />
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="lg:hidden space-y-2">
                {active.map(m => (
                  <StaffCard key={m.id} member={m} services={services}
                    onToggle={toggle} onReset={setResetTarget}
                    onEditServices={openEditServices} toggling={toggling === m.id}
                    onToggleSunday={toggleSundayGrace} togglingSunday={togglingSunday === m.id}
                    onEditDays={openEditDays} />
                ))}
              </div>
            </section>
          )}

          {inactive.length > 0 && (
            <section>
              <p className="text-[var(--text-dim)] text-xs font-semibold uppercase tracking-wider mb-3">
                Inactive · {inactive.length}
              </p>
              <div className="hidden lg:block bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden opacity-60">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-[var(--border)]">
                    {inactive.map(m => (
                      <StaffRow key={m.id} member={m} services={services}
                        onToggle={toggle} onReset={setResetTarget}
                        onEditServices={openEditServices} toggling={toggling === m.id}
                        onToggleSunday={toggleSundayGrace} togglingSunday={togglingSunday === m.id}
                        onEditDays={openEditDays} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="lg:hidden space-y-2 opacity-60">
                {inactive.map(m => (
                  <StaffCard key={m.id} member={m} services={services}
                    onToggle={toggle} onReset={setResetTarget}
                    onEditServices={openEditServices} toggling={toggling === m.id}
                    onToggleSunday={toggleSundayGrace} togglingSunday={togglingSunday === m.id}
                    onEditDays={openEditDays} />
                ))}
              </div>
            </section>
          )}

          {staff.length === 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-12 text-center">
              <p className="text-[var(--text-faint)] text-sm">No staff yet. Tap Add Staff to create the first account.</p>
            </div>
          )}
        </>
      )}

      {/* Add Staff Modal */}
      {showAdd && (
        <Modal title="Add Staff Member" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Full Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Chukwu Nnamdi" required autoCapitalize="words" className="input" />
            </div>
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Phone Number</label>
              <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                placeholder="08012345678" required className="input" />
            </div>
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Starting PIN</label>
              <input type="password" value={newPIN}
                onChange={e => setNewPIN(e.target.value.replace(/\D/g,'').slice(0,4))}
                placeholder="••••" inputMode="numeric" maxLength={4} required
                className="input text-center tracking-[0.5em]" />
              <p className="text-[var(--text-faint)] text-xs mt-1.5">Staff will change this on first login.</p>
            </div>
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-2">Days Off (optional)</label>
              <DayPicker selected={newOffDays} onChange={setNewOffDays} />
              <p className="text-[var(--text-faint)] text-xs mt-1.5">Select which days this staff member doesn&apos;t work.</p>
            </div>
            {addError && <p className="text-red-400 text-sm">{addError}</p>}
            <button type="submit" disabled={addLoading || newPIN.length !== 4}
              className="w-full bg-[var(--text)] text-[var(--bg)] font-semibold py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] transition-all">
              {addLoading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
        </Modal>
      )}

      {/* Reset PIN Modal */}
      {resetTarget && (
        <Modal title={`Reset PIN — ${resetTarget.name}`}
          onClose={() => { setResetTarget(null); setResetPIN(''); setResetError('') }}>
          <p className="text-[var(--text-muted)] text-sm mb-5">
            Set a temporary PIN for {resetTarget.name.split(' ')[0]}. They will be prompted to change it on next login.
          </p>
          <form onSubmit={handleResetPIN} className="space-y-4">
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">New PIN</label>
              <input type="password" value={resetPIN}
                onChange={e => setResetPIN(e.target.value.replace(/\D/g,'').slice(0,4))}
                placeholder="••••" inputMode="numeric" maxLength={4} required
                className="input text-center tracking-[0.5em]" />
            </div>
            {resetError && <p className="text-red-400 text-sm">{resetError}</p>}
            <button type="submit" disabled={resetLoading || resetPIN.length !== 4}
              className="w-full bg-[var(--text)] text-[var(--bg)] font-semibold py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] transition-all">
              {resetLoading ? 'Saving…' : 'Save New PIN'}
            </button>
          </form>
        </Modal>
      )}

      {/* Edit Categories Modal */}
      {servicesTarget && (
        <Modal title={`Categories — ${servicesTarget.name}`}
          onClose={() => setServicesTarget(null)}>
          <p className="text-[var(--text-muted)] text-sm mb-4">
            Pick the service categories {servicesTarget.name.split(' ')[0]} can perform.
            All services inside the selected categories will be available.
          </p>
          <form onSubmit={handleSaveServices}>
            <div className="space-y-2 mb-5 max-h-[500px] overflow-y-auto pr-1">
              {allCategories.map(cat => {
                const on = editCategories.includes(cat)
                const count = services.filter(s => s.category === cat).length
                return (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                      on ? 'bg-[var(--text)] border-[var(--text)] text-[var(--bg)]' : 'bg-[var(--elevated)] border-[var(--border-strong)] text-[var(--text)] hover:border-[var(--text-faint)]'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        on ? 'bg-[var(--text)] border-gray-950' : 'border-[#444]'
                      }`}>
                        {on && (
                          <svg className="w-2.5 h-2.5 text-[var(--text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">{cat}</span>
                    </div>
                    <span className={`text-xs ${on ? 'text-gray-600' : 'text-[var(--text-dim)]'}`}>
                      {count} service{count === 1 ? '' : 's'}
                    </span>
                  </button>
                )
              })}
            </div>
            {editError && <p className="text-red-400 text-sm mb-3">{editError}</p>}
            <button type="submit" disabled={editLoading}
              className="w-full bg-[var(--text)] text-[var(--bg)] font-semibold py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] transition-all">
              {editLoading ? 'Saving…' : `Save Categories (${editCategories.length} selected)`}
            </button>
          </form>
        </Modal>
      )}
      {/* Edit Off Days Modal */}
      {daysTarget && (
        <Modal title={`Days Off — ${daysTarget.name}`}
          onClose={() => setDaysTarget(null)}>
          <p className="text-[var(--text-muted)] text-sm mb-4">
            Select which days {daysTarget.name.split(' ')[0]} doesn&apos;t work. They won&apos;t appear in attendance on these days.
          </p>
          <form onSubmit={handleSaveOffDays} className="space-y-4">
            <DayPicker selected={daysOff} onChange={setDaysOff} />
            {daysError && <p className="text-red-400 text-sm">{daysError}</p>}
            <button type="submit" disabled={daysLoading}
              className="w-full bg-[var(--text)] text-[var(--bg)] font-semibold py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] transition-all">
              {daysLoading ? 'Saving…' : `Save Days Off${daysOff.length > 0 ? ` (${daysOff.length} day${daysOff.length > 1 ? 's' : ''})` : ''}`}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ── Service tags strip ─────────────────────────────────────── */
function CategoryTags({ categories }: { categories: string[] }) {
  if (!categories || categories.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        No categories
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {categories.map(c => (
        <span key={c} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--elevated)] border border-[var(--border-strong)] text-[var(--text-muted)]">
          {c}
        </span>
      ))}
    </div>
  )
}

/* ── Desktop table row ──────────────────────────────────────── */
function StaffRow({ member, services, onToggle, onReset, onEditServices, toggling, onToggleSunday, togglingSunday, onEditDays }: {
  member: StaffMember
  services: Service[]
  onToggle: (m: StaffMember) => void
  onReset: (m: StaffMember) => void
  onEditServices: (m: StaffMember) => void
  toggling: boolean
  onToggleSunday: (m: StaffMember) => void
  togglingSunday: boolean
  onEditDays: (m: StaffMember) => void
}) {
  return (
    <tr>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--border)] border border-[var(--border-strong)] flex items-center justify-center flex-shrink-0">
            <span className="text-[var(--text)] text-xs font-semibold">{member.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[var(--text)] font-medium leading-tight">{member.name}</p>
            {member.sunday_grace && (
              <span className="inline-block mt-1 text-[10px] font-medium text-[#6366f1] bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-full px-1.5 py-0.5 leading-none">
                Sun. Grace
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <CategoryTags categories={member.categories ?? []} />
      </td>
      <td className="px-5 py-4">
        <OffDayTags offDays={member.off_days ?? []} />
      </td>
      <td className="px-5 py-4 text-[var(--text-muted)]">{member.phone}</td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => onEditServices(member)}
            className="text-[var(--text-muted)] text-xs font-medium hover:text-[var(--text)] hover:bg-[var(--elevated)] transition-all rounded-md px-2.5 py-1.5">
            Services
          </button>
          <button onClick={() => onEditDays(member)}
            className="text-[var(--text-muted)] text-xs font-medium hover:text-[var(--text)] hover:bg-[var(--elevated)] transition-all rounded-md px-2.5 py-1.5">
            Days Off
          </button>
          <button onClick={() => onReset(member)}
            className="text-[var(--text-muted)] text-xs font-medium hover:text-[var(--text)] hover:bg-[var(--elevated)] transition-all rounded-md px-2.5 py-1.5">
            Reset PIN
          </button>
          <button onClick={() => onToggleSunday(member)} disabled={togglingSunday}
            className={`text-xs font-medium rounded-md px-2.5 py-1.5 transition-all disabled:opacity-50 ${
              member.sunday_grace
                ? 'text-[#6366f1] bg-[#6366f1]/10 hover:bg-[#6366f1]/15'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elevated)]'
            }`}>
            Sun. Grace{member.sunday_grace ? ' ✓' : ''}
          </button>
          <div className="w-px h-5 bg-[var(--border)] mx-1" />
          <Toggle active={member.is_active} loading={toggling} onChange={() => onToggle(member)} />
        </div>
      </td>
    </tr>
  )
}

/* ── Mobile card ────────────────────────────────────────────── */
function StaffCard({ member, services, onToggle, onReset, onEditServices, toggling, onToggleSunday, togglingSunday, onEditDays }: {
  member: StaffMember
  services: Service[]
  onToggle: (m: StaffMember) => void
  onReset: (m: StaffMember) => void
  onEditServices: (m: StaffMember) => void
  toggling: boolean
  onToggleSunday: (m: StaffMember) => void
  togglingSunday: boolean
  onEditDays: (m: StaffMember) => void
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3.5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[var(--border)] border border-[var(--border-strong)] flex items-center justify-center flex-shrink-0">
            <span className="text-[var(--text)] text-xs font-semibold">{member.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[var(--text)] text-sm font-medium truncate">{member.name}</p>
            <p className="text-[var(--text-dim)] text-xs">{member.phone}</p>
          </div>
        </div>
        <Toggle active={member.is_active} loading={toggling} onChange={() => onToggle(member)} />
      </div>
      <div className="mb-2 pl-11">
        <CategoryTags categories={member.categories ?? []} />
      </div>
      <div className="mb-3 pl-11">
        <OffDayTags offDays={member.off_days ?? []} />
      </div>
      <div className="flex items-center gap-1 pl-11 flex-wrap -ml-1">
        <button onClick={() => onEditServices(member)}
          className="text-[var(--text-muted)] text-xs font-medium rounded-md px-2.5 py-1.5 hover:text-[var(--text)] hover:bg-[var(--elevated)] transition-all">
          Services
        </button>
        <button onClick={() => onEditDays(member)}
          className="text-[var(--text-muted)] text-xs font-medium rounded-md px-2.5 py-1.5 hover:text-[var(--text)] hover:bg-[var(--elevated)] transition-all">
          Days Off
        </button>
        <button onClick={() => onReset(member)}
          className="text-[var(--text-muted)] text-xs font-medium rounded-md px-2.5 py-1.5 hover:text-[var(--text)] hover:bg-[var(--elevated)] transition-all">
          Reset PIN
        </button>
        <button onClick={() => onToggleSunday(member)} disabled={togglingSunday}
          className={`text-xs font-medium rounded-md px-2.5 py-1.5 transition-all disabled:opacity-50 ${
            member.sunday_grace
              ? 'text-[#6366f1] bg-[#6366f1]/10'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elevated)]'
          }`}>
          Sun. Grace{member.sunday_grace ? ' ✓' : ''}
        </button>
      </div>
    </div>
  )
}

/* ── Day picker ─────────────────────────────────────────────── */
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function DayPicker({ selected, onChange }: { selected: number[]; onChange: (days: number[]) => void }) {
  function toggle(d: number) {
    onChange(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d])
  }
  return (
    <div className="flex gap-1.5 flex-wrap">
      {DAY_LABELS.map((label, i) => {
        const on = selected.includes(i)
        return (
          <button key={i} type="button" onClick={() => toggle(i)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              on
                ? 'bg-[var(--text)] border-[var(--text)] text-[var(--bg)]'
                : 'bg-[var(--elevated)] border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-faint)]'
            }`}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Days-off tag strip ─────────────────────────────────────── */
function OffDayTags({ offDays }: { offDays: number[] }) {
  if (offDays.length === 0) return <span className="text-[var(--text-faint)] text-xs italic">No days off set</span>
  return (
    <div className="flex flex-wrap gap-1">
      {offDays.sort((a, b) => a - b).map(d => (
        <span key={d} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--border)] border border-[var(--border-strong)] text-[var(--text-muted)]">
          {DAY_LABELS[d]}
        </span>
      ))}
    </div>
  )
}

/* ── Toggle switch ──────────────────────────────────────────── */
function Toggle({ active, loading, onChange }: { active: boolean; loading: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} disabled={loading}
      aria-label={active ? 'Set inactive' : 'Set active'}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
        active ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
      }`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
        active ? 'translate-x-5' : 'translate-x-0.5'
      }`} />
    </button>
  )
}

/* ── Modal ──────────────────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--card)] border border-[var(--border-strong)] rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[var(--text)] font-semibold">{title}</h2>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
