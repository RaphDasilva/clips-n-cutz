'use client'

import { useState, useEffect } from 'react'
import { getSession, clearSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function StaffSettings() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; name: string; phone: string } | null>(null)

  // Change PIN form
  const [currentPIN, setCurrentPIN] = useState('')
  const [newPIN, setNewPIN]         = useState('')
  const [confirmPIN, setConfirmPIN] = useState('')
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/login'); return }
    setUser({ id: s.id, name: s.name, phone: s.phone })
  }, [router])

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
        <h1 className="text-white text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-[#555] text-sm mt-0.5">Manage your account</p>
      </div>

      {/* Profile card */}
      <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 mb-6">
        <h2 className="text-[#666] text-xs font-semibold uppercase tracking-wider mb-4">Your Account</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg font-bold">
              {user?.name.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold">{user?.name}</p>
            <p className="text-[#555] text-sm">{user?.phone}</p>
            <p className="text-[#444] text-xs mt-0.5">Staff</p>
          </div>
        </div>
      </div>

      {/* Change PIN */}
      <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 mb-6">
        <h2 className="text-[#666] text-xs font-semibold uppercase tracking-wider mb-5">Change PIN</h2>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-4 text-center">
            <p className="text-emerald-400 text-sm font-medium">PIN changed successfully.</p>
            <p className="text-[#555] text-xs mt-1">Signing you out — please log in with your new PIN.</p>
          </div>
        ) : (
          <form onSubmit={handleChangePIN} className="space-y-4">
            <div>
              <label className="block text-[#888] text-xs font-medium mb-1.5">Current PIN</label>
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
              <label className="block text-[#888] text-xs font-medium mb-1.5">New PIN</label>
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
              <label className="block text-[#888] text-xs font-medium mb-1.5">Confirm New PIN</label>
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
              className="bg-white text-gray-950 font-semibold px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-100 active:scale-[0.98] transition-all"
            >
              {loading ? 'Saving…' : 'Save New PIN'}
            </button>
          </form>
        )}
      </div>

      {/* Log out */}
      <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
        <h2 className="text-[#666] text-xs font-semibold uppercase tracking-wider mb-4">Session</h2>
        <p className="text-[#555] text-sm mb-4">
          You are automatically signed out after 8 hours for security.
        </p>
        <button
          onClick={() => { clearSession(); router.replace('/login') }}
          className="flex items-center gap-2 text-[#888] hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl px-4 py-2.5 text-sm transition-all"
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
