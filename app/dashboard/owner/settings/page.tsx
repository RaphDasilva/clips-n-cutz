'use client'

import { useState, useEffect } from 'react'
import { getSession, clearSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function OwnerSettings() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; name: string; phone: string } | null>(null)

  // Profile
  const [editName, setEditName]   = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [profilePIN, setProfilePIN]     = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  // PIN
  const [currentPIN, setCurrentPIN] = useState('')
  const [newPIN, setNewPIN]         = useState('')
  const [confirmPIN, setConfirmPIN] = useState('')
  const [pinError, setPinError]     = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/login'); return }
    setUser({ id: s.id, name: s.name, phone: s.phone })
    setEditName(s.name)
    setEditPhone(s.phone)
  }, [router])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(''); setProfileSuccess(false)
    setProfileLoading(true)
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id, currentPIN: profilePIN, name: editName, phone: editPhone }),
      })
      const data = await res.json()
      if (!res.ok) { setProfileError(data.error ?? 'Failed to save changes.'); return }
      setProfileSuccess(true)
      setProfilePIN('')
      setTimeout(() => {
        setProfileSuccess(false)
        clearSession()
        router.replace('/login')
      }, 2000)
    } catch {
      setProfileError('Connection error. Try again.')
    } finally {
      setProfileLoading(false)
    }
  }

  async function handleChangePIN(e: React.FormEvent) {
    e.preventDefault()
    setPinError(''); setPinSuccess(false)
    if (newPIN !== confirmPIN) { setPinError('New PINs do not match.'); return }
    if (newPIN === currentPIN) { setPinError('New PIN must be different from your current PIN.'); return }
    setPinLoading(true)
    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id, currentPIN, newPIN }),
      })
      const data = await res.json()
      if (!res.ok) { setPinError(data.error ?? 'Failed to change PIN.'); return }
      setPinSuccess(true)
      setCurrentPIN(''); setNewPIN(''); setConfirmPIN('')
      setTimeout(() => { clearSession(); router.replace('/login') }, 2000)
    } catch {
      setPinError('Connection error. Try again.')
    } finally {
      setPinLoading(false)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-3xl mx-auto">

      <div className="mb-8">
        <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-[var(--text-dim)] text-sm mt-0.5">Manage your account</p>
      </div>

      {/* Update Profile */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-5">Login Details</h2>
        {profileSuccess ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-4 text-center">
            <p className="text-emerald-400 text-sm font-medium">Details updated successfully.</p>
            <p className="text-[var(--text-dim)] text-xs mt-1">Signing you out — please log in again.</p>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Full Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                placeholder="Your full name" required className="input" />
            </div>
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Phone Number</label>
              <input value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="08012345678" inputMode="numeric" required className="input" />
            </div>
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Confirm with Current PIN</label>
              <input type="password" value={profilePIN}
                onChange={e => setProfilePIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••" inputMode="numeric" maxLength={4} required
                className="input text-center tracking-[0.5em] max-w-[180px]" />
              <p className="text-[var(--text-faint)] text-xs mt-1.5">Enter your PIN to confirm the changes.</p>
            </div>
            {profileError && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{profileError}</p>
              </div>
            )}
            <button type="submit"
              disabled={profileLoading || profilePIN.length !== 4 || !editName || !editPhone}
              className="bg-[var(--text)] text-[var(--bg)] font-semibold px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all">
              {profileLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>

      {/* Change PIN */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-5">Change PIN</h2>
        {pinSuccess ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-4 text-center">
            <p className="text-emerald-400 text-sm font-medium">PIN changed successfully.</p>
            <p className="text-[var(--text-dim)] text-xs mt-1">Signing you out — please log in with your new PIN.</p>
          </div>
        ) : (
          <form onSubmit={handleChangePIN} className="space-y-4">
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Current PIN</label>
              <input type="password" value={currentPIN}
                onChange={e => setCurrentPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••" inputMode="numeric" maxLength={4} required
                className="input text-center tracking-[0.5em] max-w-[180px]" />
            </div>
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">New PIN</label>
              <input type="password" value={newPIN}
                onChange={e => setNewPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••" inputMode="numeric" maxLength={4} required
                className="input text-center tracking-[0.5em] max-w-[180px]" />
            </div>
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Confirm New PIN</label>
              <input type="password" value={confirmPIN}
                onChange={e => setConfirmPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••" inputMode="numeric" maxLength={4} required
                className="input text-center tracking-[0.5em] max-w-[180px]" />
            </div>
            {pinError && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{pinError}</p>
              </div>
            )}
            <button type="submit"
              disabled={pinLoading || currentPIN.length !== 4 || newPIN.length !== 4 || confirmPIN.length !== 4}
              className="bg-[var(--text)] text-[var(--bg)] font-semibold px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all">
              {pinLoading ? 'Saving…' : 'Save New PIN'}
            </button>
          </form>
        )}
      </div>

      {/* Logout */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-4">Session</h2>
        <p className="text-[var(--text-dim)] text-sm mb-4">You are automatically signed out after 8 hours for security.</p>
        <button onClick={() => { clearSession(); router.replace('/login') }}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border-strong)] hover:border-[var(--text-faint)] rounded-xl px-4 py-2.5 text-sm transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Log out
        </button>
      </div>
    </div>
  )
}
