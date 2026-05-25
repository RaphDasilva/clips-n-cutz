'use client'

import { useState, useEffect } from 'react'
import { getSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface TeamMember {
  id: string
  name: string
  phone: string
  role: string
  is_active: boolean
  must_change_pin: boolean
  created_at: string
}

export default function OwnerTeamPage() {
  const router = useRouter()
  const [team, setTeam]       = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  // Add modal
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPin, setNewPin]   = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError]     = useState('')

  // Reset PIN modal
  const [resetTarget, setResetTarget] = useState<TeamMember | null>(null)
  const [resetPin, setResetPin]       = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError]     = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/login'); return }
    loadTeam()
  }, [router])

  async function loadTeam() {
    setLoading(true)
    const res = await fetch('/api/owner/team')
    if (res.ok) {
      const d = await res.json()
      setTeam(d.team ?? [])
    }
    setLoading(false)
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    try {
      const res = await fetch('/api/owner/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, phone: newPhone, pin: newPin }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error ?? 'Failed to create account.'); return }
      setShowAdd(false)
      setNewName(''); setNewPhone(''); setNewPin('')
      loadTeam()
    } catch {
      setAddError('Connection error. Try again.')
    } finally {
      setAddLoading(false)
    }
  }

  async function toggleActive(member: TeamMember) {
    await fetch(`/api/owner/team/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle-active' }),
    })
    setTeam(prev => prev.map(m => m.id === member.id ? { ...m, is_active: !m.is_active } : m))
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault()
    setResetError(''); setResetSuccess(false)
    setResetLoading(true)
    try {
      const res = await fetch(`/api/owner/team/${resetTarget!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-pin', pin: resetPin }),
      })
      const data = await res.json()
      if (!res.ok) { setResetError(data.error ?? 'Failed to reset PIN.'); return }
      setResetSuccess(true)
      setResetPin('')
      setTimeout(() => { setResetTarget(null); setResetSuccess(false) }, 1500)
    } catch {
      setResetError('Connection error. Try again.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-3xl mx-auto">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-[var(--text-dim)] text-sm mt-0.5">Manage customer care accounts</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 bg-[var(--text)] text-[var(--bg)] font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all w-fit">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Account
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0,1].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-20 animate-pulse" />)}
        </div>
      ) : team.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-16 text-center">
          <p className="text-[var(--text-dim)] text-sm">No manager accounts yet.</p>
          <p className="text-[var(--text-faint)] text-sm mt-1">Tap &quot;Add Account&quot; to create one.</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
          {team.map(m => (
            <div key={m.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[var(--border)] border border-[var(--border-strong)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[var(--text)] text-sm font-semibold">{m.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[var(--text)] text-sm font-medium">{m.name}</p>
                    {!m.is_active && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-dim)] text-xs mt-0.5">{m.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => { setResetTarget(m); setResetPin(''); setResetError(''); setResetSuccess(false) }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border-strong)] hover:border-[var(--text-faint)] px-3 py-1.5 rounded-lg transition-all">
                  Reset PIN
                </button>
                <button onClick={() => toggleActive(m)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    m.is_active
                      ? 'text-[var(--text-muted)] hover:text-red-400 border-[var(--border-strong)] hover:border-red-500/30'
                      : 'text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40'
                  }`}>
                  {m.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowAdd(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
              <h2 className="text-[var(--text)] font-semibold">Add Manager Account</h2>
              <button onClick={() => setShowAdd(false)} className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitAdd} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Full Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Cajetan Okolo" required className="input" />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Phone Number</label>
                <input value={newPhone} onChange={e => setNewPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="08012345678" inputMode="numeric" required className="input" />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Starting PIN</label>
                <input type="password" value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••" inputMode="numeric" maxLength={4} required
                  className="input text-center tracking-[0.5em] max-w-[120px]" />
                <p className="text-[var(--text-faint)] text-xs mt-1.5">They will be asked to change this on first login.</p>
              </div>
              {addError && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{addError}</p>
                </div>
              )}
              <button type="submit" disabled={addLoading || newPin.length !== 4}
                className="w-full bg-[var(--text)] text-[var(--bg)] font-semibold py-3 rounded-xl text-sm hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all disabled:opacity-40">
                {addLoading ? 'Creating…' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setResetTarget(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
              <h2 className="text-[var(--text)] font-semibold">Reset PIN — {resetTarget.name}</h2>
              <button onClick={() => setResetTarget(null)} className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitReset} className="px-6 py-5 space-y-4">
              {resetSuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-4 text-center">
                  <p className="text-emerald-400 text-sm font-medium">PIN reset successfully.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">New PIN</label>
                    <input type="password" value={resetPin}
                      onChange={e => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••" inputMode="numeric" maxLength={4} required
                      className="input text-center tracking-[0.5em] max-w-[120px]" />
                    <p className="text-[var(--text-faint)] text-xs mt-1.5">They will be asked to change this on next login.</p>
                  </div>
                  {resetError && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                      <p className="text-red-400 text-sm">{resetError}</p>
                    </div>
                  )}
                  <button type="submit" disabled={resetLoading || resetPin.length !== 4}
                    className="w-full bg-[var(--text)] text-[var(--bg)] font-semibold py-3 rounded-xl text-sm hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all disabled:opacity-40">
                    {resetLoading ? 'Saving…' : 'Set New PIN'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
