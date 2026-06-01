'use client'

import { useState, useEffect } from 'react'
import { getSession, clearSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/theme-provider'

export default function StaffSettings() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<{ id: string; name: string; phone: string } | null>(null)

  // Change PIN form
  const [currentPIN, setCurrentPIN] = useState('')
  const [newPIN, setNewPIN]         = useState('')
  const [confirmPIN, setConfirmPIN] = useState('')
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const [loading, setLoading]       = useState(false)

  // Bank details form
  const [bankName, setBankName]           = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName]     = useState('')
  const [bankError, setBankError]         = useState('')
  const [bankSuccess, setBankSuccess]     = useState(false)
  const [bankSaving, setBankSaving]       = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/login'); return }
    setUser({ id: s.id, name: s.name, phone: s.phone })
    fetch('/api/staff/bank')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setBankName(d.bankName ?? '')
        setAccountNumber(d.accountNumber ?? '')
        setAccountName(d.accountName ?? '')
      })
      .catch(() => {})
  }, [router])

  async function handleSaveBank(e: React.FormEvent) {
    e.preventDefault()
    setBankError(''); setBankSuccess(false)
    if (accountNumber && accountNumber.length !== 10) {
      setBankError('Account number must be exactly 10 digits.')
      return
    }
    setBankSaving(true)
    try {
      const res = await fetch('/api/staff/bank', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, accountNumber, accountName }),
      })
      const data = await res.json()
      if (!res.ok) { setBankError(data.error ?? 'Failed to save.'); return }
      setBankSuccess(true)
      setTimeout(() => setBankSuccess(false), 3000)
    } catch {
      setBankError('Connection error. Try again.')
    } finally {
      setBankSaving(false)
    }
  }

  async function handleChangePIN(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(false)

    if (newPIN !== confirmPIN) { setError('New PINs do not match.'); return }
    if (newPIN === currentPIN) { setError('New PIN must be different from your current PIN.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id, currentPIN, newPIN }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to change PIN.'); return }

      setSuccess(true)
      setCurrentPIN(''); setNewPIN(''); setConfirmPIN('')
      // Log out so they sign in fresh with the new PIN
      setTimeout(() => { clearSession(); router.replace('/login') }, 2000)
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-3xl mx-auto">

      <div className="mb-8">
        <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-[var(--text-dim)] text-sm mt-0.5">Manage your account</p>
      </div>

      {/* Profile card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-4">Your Account</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--border)] border border-[var(--border-strong)] flex items-center justify-center flex-shrink-0">
            <span className="text-[var(--text)] text-lg font-bold">
              {user?.name.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
          <div>
            <p className="text-[var(--text)] font-semibold">{user?.name}</p>
            <p className="text-[var(--text-dim)] text-sm">{user?.phone}</p>
            <p className="text-[var(--text-faint)] text-xs mt-0.5">Staff</p>
          </div>
        </div>
      </div>

      {/* Change PIN */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-5">Change PIN</h2>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-4 text-center">
            <p className="text-emerald-400 text-sm font-medium">PIN changed successfully.</p>
            <p className="text-[var(--text-dim)] text-xs mt-1">Signing you out — please log in with your new PIN.</p>
          </div>
        ) : (
          <form onSubmit={handleChangePIN} className="space-y-4">
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Current PIN</label>
              <input
                type="password"
                value={currentPIN}
                onChange={e => setCurrentPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                required
                className="input text-center tracking-[0.5em] max-w-[180px]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">New PIN</label>
              <input
                type="password"
                value={newPIN}
                onChange={e => setNewPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                required
                className="input text-center tracking-[0.5em] max-w-[180px]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Confirm New PIN</label>
              <input
                type="password"
                value={confirmPIN}
                onChange={e => setConfirmPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                required
                className="input text-center tracking-[0.5em] max-w-[180px]"
              />
            </div>

            {error && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || currentPIN.length !== 4 || newPIN.length !== 4 || confirmPIN.length !== 4}
              className="bg-[var(--text)] text-[var(--bg)] font-semibold px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all"
            >
              {loading ? 'Saving…' : 'Save New PIN'}
            </button>
          </form>
        )}
      </div>

      {/* Bank Account — owner sends weekly payouts here */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-1">Bank Account</h2>
        <p className="text-[var(--text-dim)] text-xs mb-5">Where your weekly payout is sent. The salon owner sees this on the payouts screen.</p>

        <form onSubmit={handleSaveBank} className="space-y-4">
          <div>
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Bank Name</label>
            <input type="text"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="e.g. GTBank, UBA, Access"
              maxLength={60}
              className="input" />
          </div>
          <div>
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">Account Number</label>
            <input type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit number"
              maxLength={10}
              className="input tabular-nums" />
            <p className="text-[var(--text-faint)] text-[10px] mt-1">Nigerian bank account numbers are 10 digits.</p>
          </div>
          <div>
            <label className="block text-[var(--text-muted)] text-xs font-medium mb-1.5">
              Account Name <span className="text-[var(--text-faint)] font-normal">— optional</span>
            </label>
            <input type="text"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              placeholder="As it appears at the bank"
              maxLength={80}
              className="input" />
            <p className="text-[var(--text-faint)] text-[10px] mt-1">Leave blank if it matches your name above.</p>
          </div>

          {bankError && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{bankError}</p>
            </div>
          )}
          {bankSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <p className="text-emerald-400 text-sm">Bank details saved.</p>
            </div>
          )}

          <button type="submit" disabled={bankSaving}
            className="bg-[var(--text)] text-[var(--bg)] font-semibold px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-[var(--text-muted)] active:scale-[0.98] transition-all">
            {bankSaving ? 'Saving…' : 'Save Bank Details'}
          </button>
        </form>
      </div>

      {/* Appearance */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[var(--text)] text-sm font-medium">Theme</p>
            <p className="text-[var(--text-dim)] text-xs mt-0.5">
              Currently using <span className="text-[var(--text)]">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
            </p>
          </div>
          <button onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border-strong)] hover:border-[var(--text-faint)] rounded-xl px-4 py-2.5 text-sm transition-all">
            {theme === 'dark' ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
                Switch to Light
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
                Switch to Dark
              </>
            )}
          </button>
        </div>
      </div>

      {/* Log out */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-4">Session</h2>
        <p className="text-[var(--text-dim)] text-sm mb-4">
          You are automatically signed out after 8 hours for security.
        </p>
        <button
          onClick={() => { clearSession(); router.replace('/login') }}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border-strong)] hover:border-[var(--text-faint)] rounded-xl px-4 py-2.5 text-sm transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Log out
        </button>
      </div>
    </div>
  )
}
