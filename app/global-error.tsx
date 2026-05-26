'use client'

// Last-resort error boundary. Renders even if the root layout fails
// (no Tailwind, no provider, no fonts — just inline styles) so old
// browsers that can't parse modern CSS still see a helpful message.

import { useEffect } from 'react'

export default function GlobalError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('GlobalError caught:', error) }, [error])

  return (
    <html lang="en">
      <body style={{
        margin: 0, padding: 0, height: '100vh',
        background: '#0a0a0a', color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          maxWidth: 360, padding: 24, textAlign: 'center',
          border: '1px solid #2a2a2a', borderRadius: 16, background: '#141414',
        }}>
          <p style={{ fontSize: 36, margin: '0 0 12px' }}>⚠️</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
            This page couldn&rsquo;t load
          </h1>
          <p style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5, margin: '0 0 20px' }}>
            If you&rsquo;re on an older iPhone, please update iOS first:{' '}
            <strong style={{ color: '#fff' }}>Settings → General → Software Update</strong>.
            <br /><br />
            Then come back and reload.
          </p>
          <button onClick={reset} style={{
            background: '#fff', color: '#0a0a0a', border: 'none',
            padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
