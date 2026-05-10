'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSession, getSession, getDashboardPath } from '@/lib/auth'
import type { SessionUser } from '@/types/database'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // If already logged in, go straight to dashboard
  useEffect(() => {
    const session = getSession()
    if (session) {
      router.replace(getDashboardPath(session.role))
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Login failed. Try again.')
        return
      }

      const user = data.user as SessionUser
      createSession(user)

      if (user.mustChangePIN) {
        router.push('/change-pin')
      } else {
        router.push(getDashboardPath(user.role))
      }
    } catch {
      setError('Something went wrong. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo / branding — replace with actual logo when available */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gray-800 border border-gray-700 mx-auto mb-5 flex items-center justify-center">
            <span className="text-gray-400 text-xs font-medium tracking-wide">LOGO</span>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Clips N&apos;Cutz
          </h1>
          <p className="text-gray-500 text-sm mt-1">Staff Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              autoComplete="tel"
              required
              className="w-full bg-gray-900 text-white border border-gray-800 rounded-xl px-4 py-3.5 text-base placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">
              4-Digit PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="••••"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              required
              className="w-full bg-gray-900 text-white border border-gray-800 rounded-xl px-4 py-3.5 text-base text-center tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800/60 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || phone.length < 7 || pin.length !== 4}
            className="w-full bg-white text-gray-950 font-semibold py-3.5 rounded-xl text-base mt-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-8">
          Forgot your PIN? Ask the manager to reset it.
        </p>
      </div>
    </main>
  )
}
