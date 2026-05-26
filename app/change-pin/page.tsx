'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, clearSession } from '@/lib/auth'

export default function ChangePinPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [currentPIN, setCurrentPIN] = useState('')
  const [newPIN, setNewPIN] = useState('')
  const [confirmPIN, setConfirmPIN] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.replace('/login')
      return
    }
    setUserId(session.id)
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPIN !== confirmPIN) {
      setError('New PINs do not match. Try again.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, currentPIN, newPIN }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to change PIN.')
        return
      }

      // Sign out so they log in fresh with the new PIN
      clearSession()
      router.replace('/login')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 mx-auto mb-5 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
            </svg>
          </div>
          <h1 className="text-[var(--text)] text-2xl font-bold tracking-tight">
            Set Your PIN
          </h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Your account was set up by the manager.<br />
            Please create your own PIN to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Current PIN (given by manager)
            </label>
            <input
              type="password"
              value={currentPIN}
              onChange={(e) =>
                setCurrentPIN(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              required
              className="w-full bg-gray-900 text-[var(--text)] border border-gray-800 rounded-xl px-4 py-3.5 text-base text-center tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">
              New PIN
            </label>
            <input
              type="password"
              value={newPIN}
              onChange={(e) =>
                setNewPIN(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              required
              className="w-full bg-gray-900 text-[var(--text)] border border-gray-800 rounded-xl px-4 py-3.5 text-base text-center tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Confirm New PIN
            </label>
            <input
              type="password"
              value={confirmPIN}
              onChange={(e) =>
                setConfirmPIN(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              required
              className="w-full bg-gray-900 text-[var(--text)] border border-gray-800 rounded-xl px-4 py-3.5 text-base text-center tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800/60 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              currentPIN.length !== 4 ||
              newPIN.length !== 4 ||
              confirmPIN.length !== 4
            }
            className="w-full bg-[var(--text)] text-[var(--bg)] font-semibold py-3.5 rounded-xl text-base mt-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {loading ? 'Saving…' : 'Save New PIN'}
          </button>
        </form>
      </div>
    </main>
  )
}
