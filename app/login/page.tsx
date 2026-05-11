'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
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
    <main className="min-h-screen bg-[#090909] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 rounded-2xl bg-white mx-auto mb-5 flex items-center justify-center overflow-hidden">
            <Image src="/logo.jpg" alt="Clips N'Cutz" width={96} height={96} className="object-contain" />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Clips N&apos;Cutz</h1>
          <p className="text-[#555] text-sm mt-1">Unisex Salon</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#888] text-xs font-medium mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              autoComplete="tel"
              required
              className="input"
            />
          </div>

          <div>
            <label className="block text-[#888] text-xs font-medium mb-1.5">4-Digit PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              required
              className="input text-center tracking-[0.5em]"
            />
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || phone.length < 7 || pin.length !== 4}
            className="w-full bg-white text-gray-950 font-semibold py-3.5 rounded-xl text-sm mt-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-[#444] text-xs mt-8">
          Forgot your PIN? Ask the manager to reset it.
        </p>
      </div>
    </main>
  )
}
