'use client'

import { useEffect } from 'react'

export default function Error({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Error caught:', error) }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-sm w-full text-center bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <p className="text-4xl mb-3">⚠️</p>
        <h1 className="text-lg font-bold mb-2">Something went wrong</h1>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-5">
          If you&rsquo;re on an older iPhone, please update iOS first:{' '}
          <strong className="text-[var(--text)]">Settings → General → Software Update</strong>.
          Then reload this page.
        </p>
        <button onClick={reset}
          className="bg-[var(--text)] text-[var(--bg)] font-semibold px-5 py-2.5 rounded-xl text-sm">
          Try again
        </button>
      </div>
    </div>
  )
}
