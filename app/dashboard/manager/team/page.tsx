'use client'

import { useEffect, useState, useCallback } from 'react'
import type { User } from '@/types/database'

type StaffMember = Omit<User, 'pin_hash'>

export default function TeamPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Add staff form
  const [newName, setNewName]   = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPIN, setNewPIN]     = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Reset PIN form
  const [resetPIN, setResetPIN]   = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const loadStaff = useCallback(async () => {
    const res = await fetch('/api/manager/staff')
    if (res.ok) {
      const data = await res.json()
      setStaff(data.staff ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])

  async function handleToggle(member: StaffMember) {
    setActionLoading(member.id)
    const res = await fetch(`/api/manager/staff/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle' }),
    })
    if (res.ok) {
      const data = await res.json()
      setStaff((prev) =>
        prev.map((s) => s.id === member.id ? { ...s, is_active: data.is_active } : s)
      )
    }
    setActionLoading(null)
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)

    const res = await fetch('/api/manager/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, phone: newPhone, pin: newPIN }),
    })
    const data = await res.json()

    if (!res.ok) {
      setAddError(data.error ?? 'Failed to add staff.')
      setAddLoading(false)
      return
    }

    setStaff((prev) => [...prev, data.staff])
    setNewName('')
    setNewPhone('')
    setNewPIN('')
    setShowAddForm(false)
    setAddLoading(false)
  }

  async function handleResetPIN(e: React.FormEvent) {
    e.preventDefault()
    if (!resetTarget) return
    setResetError('')
    setResetLoading(true)

    const res = await fetch(`/api/manager/staff/${resetTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-pin', newPIN: resetPIN }),
    })
    const data = await res.json()

    if (!res.ok) {
      setResetError(data.error ?? 'Failed to reset PIN.')
      setResetLoading(false)
      return
    }

    setResetPIN('')
    setResetTarget(null)
    setResetLoading(false)
  }

  const activeStaff   = staff.filter((s) => s.is_active)
  const inactiveStaff = staff.filter((s) => !s.is_active)

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-xl font-bold">Team</h1>
        <button
          onClick={() => { setShowAddForm(true); setAddError('') }}
          className="bg-white text-gray-950 text-sm font-semibold px-4 py-2 rounded-xl active:scale-[0.98] transition-all"
        >
          Add Staff
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-gray-900 rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Active staff */}
          {activeStaff.length > 0 && (
            <section className="mb-6">
              <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Active · {activeStaff.length}
              </h2>
              <div className="space-y-2">
                {activeStaff.map((member) => (
                  <StaffCard
                    key={member.id}
                    member={member}
                    onToggle={handleToggle}
                    onResetPIN={setResetTarget}
                    toggling={actionLoading === member.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Inactive staff */}
          {inactiveStaff.length > 0 && (
            <section className="mb-6">
              <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Inactive · {inactiveStaff.length}
              </h2>
              <div className="space-y-2">
                {inactiveStaff.map((member) => (
                  <StaffCard
                    key={member.id}
                    member={member}
                    onToggle={handleToggle}
                    onResetPIN={setResetTarget}
                    toggling={actionLoading === member.id}
                  />
                ))}
              </div>
            </section>
          )}

          {staff.length === 0 && (
            <p className="text-center text-gray-600 text-sm py-12">
              No staff yet. Tap Add Staff to create the first account.
            </p>
          )}
        </>
      )}

      {/* Add Staff Modal */}
      {showAddForm && (
        <Modal title="Add Staff Member" onClose={() => setShowAddForm(false)}>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Full Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Chukwu Nnamdi"
                required
                autoCapitalize="words"
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Phone Number</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="08012345678"
                required
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Starting PIN</label>
              <input
                type="password"
                value={newPIN}
                onChange={(e) => setNewPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                required
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-sm text-center tracking-[0.5em] focus:outline-none focus:border-gray-500"
              />
              <p className="text-gray-600 text-xs mt-1.5">
                Staff will be asked to change this on first login.
              </p>
            </div>
            {addError && <p className="text-red-400 text-sm">{addError}</p>}
            <button
              type="submit"
              disabled={addLoading || newPIN.length !== 4}
              className="w-full bg-white text-gray-950 font-semibold py-3 rounded-xl text-sm disabled:opacity-40"
            >
              {addLoading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
        </Modal>
      )}

      {/* Reset PIN Modal */}
      {resetTarget && (
        <Modal title={`Reset PIN — ${resetTarget.name}`} onClose={() => { setResetTarget(null); setResetPIN(''); setResetError('') }}>
          <p className="text-gray-400 text-sm mb-4">
            Enter a new PIN for {resetTarget.name.split(' ')[0]}. They will be asked to change it on next login.
          </p>
          <form onSubmit={handleResetPIN} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">New PIN</label>
              <input
                type="password"
                value={resetPIN}
                onChange={(e) => setResetPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                required
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-sm text-center tracking-[0.5em] focus:outline-none focus:border-gray-500"
              />
            </div>
            {resetError && <p className="text-red-400 text-sm">{resetError}</p>}
            <button
              type="submit"
              disabled={resetLoading || resetPIN.length !== 4}
              className="w-full bg-white text-gray-950 font-semibold py-3 rounded-xl text-sm disabled:opacity-40"
            >
              {resetLoading ? 'Saving…' : 'Save New PIN'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function StaffCard({
  member,
  onToggle,
  onResetPIN,
  toggling,
}: {
  member: StaffMember
  onToggle: (m: StaffMember) => void
  onResetPIN: (m: StaffMember) => void
  toggling: boolean
}) {
  return (
    <div className={`bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between ${!member.is_active ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-white text-sm font-medium truncate">{member.name}</p>
        <p className="text-gray-500 text-xs mt-0.5">{member.phone}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onResetPIN(member)}
          className="text-gray-500 text-xs border border-gray-700 rounded-lg px-2.5 py-1.5"
        >
          Reset PIN
        </button>
        <button
          onClick={() => onToggle(member)}
          disabled={toggling}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            member.is_active ? 'bg-white' : 'bg-gray-700'
          } disabled:opacity-50`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-gray-950 transition-transform ${
            member.is_active ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
