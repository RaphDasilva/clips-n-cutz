'use client'

import { useEffect, useState, useCallback } from 'react'
import type { User } from '@/types/database'

type StaffMember = Omit<User, 'pin_hash'>

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-xs font-semibold">{name.charAt(0).toUpperCase()}</span>
    </div>
  )
}

export default function TeamPage() {
  const [staff, setStaff]               = useState<StaffMember[]>([])
  const [loading, setLoading]           = useState(true)
  const [showAdd, setShowAdd]           = useState(false)
  const [resetTarget, setResetTarget]   = useState<StaffMember | null>(null)
  const [toggling, setToggling]         = useState<string | null>(null)

  // Add form state
  const [newName, setNewName]   = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPIN, setNewPIN]     = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Reset PIN state
  const [resetPIN, setResetPIN]     = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const loadStaff = useCallback(async () => {
    const res = await fetch('/api/manager/staff')
    if (res.ok) setStaff((await res.json()).staff ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])

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
      body: JSON.stringify({ name: newName, phone: newPhone, pin: newPIN }),
    })
    const data = await res.json()
    if (!res.ok) { setAddError(data.error ?? 'Failed.'); setAddLoading(false); return }
    setStaff(p => [...p, data.staff])
    setNewName(''); setNewPhone(''); setNewPIN(''); setShowAdd(false); setAddLoading(false)
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

  const active   = staff.filter(s => s.is_active)
  const inactive = staff.filter(s => !s.is_active)

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-[#555] text-sm mt-0.5">{staff.length} staff member{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setShowAdd(true); setAddError('') }}
          className="inline-flex items-center gap-2 bg-white text-gray-950 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-gray-100 active:scale-[0.98] transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Staff
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3].map(i => <div key={i} className="bg-[#141414] border border-[#1e1e1e] rounded-xl h-16 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Active */}
          {active.length > 0 && (
            <section className="mb-8">
              <p className="text-[#555] text-xs font-semibold uppercase tracking-wider mb-3">
                Active · {active.length}
              </p>
              {/* Desktop table */}
              <div className="hidden lg:block bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1e1e1e]">
                      <th className="text-left text-[#555] text-xs font-medium px-5 py-3">Name</th>
                      <th className="text-left text-[#555] text-xs font-medium px-5 py-3">Phone</th>
                      <th className="text-left text-[#555] text-xs font-medium px-5 py-3">Status</th>
                      <th className="text-right text-[#555] text-xs font-medium px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e]">
                    {active.map(m => (
                      <StaffRow key={m.id} member={m} onToggle={toggle} onReset={setResetTarget} toggling={toggling === m.id} />
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="lg:hidden space-y-2">
                {active.map(m => <StaffCard key={m.id} member={m} onToggle={toggle} onReset={setResetTarget} toggling={toggling === m.id} />)}
              </div>
            </section>
          )}

          {/* Inactive */}
          {inactive.length > 0 && (
            <section>
              <p className="text-[#555] text-xs font-semibold uppercase tracking-wider mb-3">
                Inactive · {inactive.length}
              </p>
              <div className="hidden lg:block bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden opacity-60">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-[#1e1e1e]">
                    {inactive.map(m => (
                      <StaffRow key={m.id} member={m} onToggle={toggle} onReset={setResetTarget} toggling={toggling === m.id} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="lg:hidden space-y-2 opacity-60">
                {inactive.map(m => <StaffCard key={m.id} member={m} onToggle={toggle} onReset={setResetTarget} toggling={toggling === m.id} />)}
              </div>
            </section>
          )}

          {staff.length === 0 && (
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-12 text-center">
              <p className="text-[#444] text-sm">No staff yet. Tap Add Staff to create the first account.</p>
            </div>
          )}
        </>
      )}

      {/* Add Staff Modal */}
      {showAdd && (
        <Modal title="Add Staff Member" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-[#888] text-xs font-medium mb-1.5">Full Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Chukwu Nnamdi" required autoCapitalize="words" className="input" />
            </div>
            <div>
              <label className="block text-[#888] text-xs font-medium mb-1.5">Phone Number</label>
              <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                placeholder="08012345678" required className="input" />
            </div>
            <div>
              <label className="block text-[#888] text-xs font-medium mb-1.5">Starting PIN</label>
              <input type="password" value={newPIN}
                onChange={e => setNewPIN(e.target.value.replace(/\D/g,'').slice(0,4))}
                placeholder="••••" inputMode="numeric" maxLength={4} required
                className="input text-center tracking-[0.5em]" />
              <p className="text-[#444] text-xs mt-1.5">Staff will change this on first login.</p>
            </div>
            {addError && <p className="text-red-400 text-sm">{addError}</p>}
            <button type="submit" disabled={addLoading || newPIN.length !== 4}
              className="w-full bg-white text-gray-950 font-semibold py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-100 transition-all">
              {addLoading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
        </Modal>
      )}

      {/* Reset PIN Modal */}
      {resetTarget && (
        <Modal title={`Reset PIN — ${resetTarget.name}`}
          onClose={() => { setResetTarget(null); setResetPIN(''); setResetError('') }}>
          <p className="text-[#888] text-sm mb-5">
            Set a temporary PIN for {resetTarget.name.split(' ')[0]}. They will be prompted to change it on next login.
          </p>
          <form onSubmit={handleResetPIN} className="space-y-4">
            <div>
              <label className="block text-[#888] text-xs font-medium mb-1.5">New PIN</label>
              <input type="password" value={resetPIN}
                onChange={e => setResetPIN(e.target.value.replace(/\D/g,'').slice(0,4))}
                placeholder="••••" inputMode="numeric" maxLength={4} required
                className="input text-center tracking-[0.5em]" />
            </div>
            {resetError && <p className="text-red-400 text-sm">{resetError}</p>}
            <button type="submit" disabled={resetLoading || resetPIN.length !== 4}
              className="w-full bg-white text-gray-950 font-semibold py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-100 transition-all">
              {resetLoading ? 'Saving…' : 'Save New PIN'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ── Desktop table row ──────────────────────────────────────── */
function StaffRow({ member, onToggle, onReset, toggling }: {
  member: StaffMember
  onToggle: (m: StaffMember) => void
  onReset: (m: StaffMember) => void
  toggling: boolean
}) {
  return (
    <tr>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">{member.name.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-white font-medium">{member.name}</span>
        </div>
      </td>
      <td className="px-5 py-4 text-[#888]">{member.phone}</td>
      <td className="px-5 py-4">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
          member.is_active
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-[#1e1e1e] text-[#555] border-[#2a2a2a]'
        }`}>
          {member.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => onReset(member)}
            className="text-[#666] text-xs hover:text-white transition-colors border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg px-3 py-1.5">
            Reset PIN
          </button>
          <Toggle active={member.is_active} loading={toggling} onChange={() => onToggle(member)} />
        </div>
      </td>
    </tr>
  )
}

/* ── Mobile card ────────────────────────────────────────────── */
function StaffCard({ member, onToggle, onReset, toggling }: {
  member: StaffMember
  onToggle: (m: StaffMember) => void
  onReset: (m: StaffMember) => void
  toggling: boolean
}) {
  return (
    <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0 mr-3">
        <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-semibold">{member.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{member.name}</p>
          <p className="text-[#555] text-xs">{member.phone}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={() => onReset(member)}
          className="text-[#555] text-xs border border-[#2a2a2a] rounded-lg px-2.5 py-1.5">
          Reset PIN
        </button>
        <Toggle active={member.is_active} loading={toggling} onChange={() => onToggle(member)} />
      </div>
    </div>
  )
}

/* ── Toggle switch ──────────────────────────────────────────── */
function Toggle({ active, loading, onChange }: { active: boolean; loading: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} disabled={loading}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${active ? 'bg-white' : 'bg-[#2a2a2a]'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-gray-950 transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

/* ── Modal ──────────────────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">{title}</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
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
