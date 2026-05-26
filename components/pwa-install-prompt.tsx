'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY     = 'cnc_pwa_dismissed_at'
const SESSION_KEY     = 'cnc_pwa_session_dismissed'
const DISMISS_DAYS    = 14   // re-show after this many days
const SHOW_DELAY_MS   = 4000 // give the page a moment before nagging

// Returns true if we should NOT show the prompt right now.
function shouldSkip(): boolean {
  if (typeof window === 'undefined') return true

  // Already installed?
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true
  if (standalone) return true

  // Dismissed earlier in this tab (defends against remounts even if storage fails)?
  try {
    if (window.sessionStorage.getItem(SESSION_KEY) === '1') return true
  } catch {/* ignore */}

  // Dismissed within the past DISMISS_DAYS?
  try {
    const v = window.localStorage.getItem(DISMISS_KEY)
    if (v) {
      const ageDays = (Date.now() - Number(v)) / 86400000
      if (ageDays < DISMISS_DAYS) return true
    }
  } catch {/* ignore */}

  return false
}

// Small floating "Add to Home Screen" prompt that surfaces:
//  - on Chrome/Android via the beforeinstallprompt event
//  - on iOS Safari with manual instructions (Apple doesn't fire
//    beforeinstallprompt; users have to use Share → Add to Home)
//
// Dismissals are remembered for two weeks so we don't nag.
export function PWAInstallPrompt() {
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIOS, setShowIOS]         = useState(false)
  const [deferred, setDeferred]       = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (shouldSkip()) return

    const ua    = window.navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)

    if (isIOS) {
      const id = setTimeout(() => {
        // Re-check just before showing — storage may have changed since mount,
        // and a remount mid-timer shouldn't override a fresh dismissal.
        if (!shouldSkip()) setShowIOS(true)
      }, SHOW_DELAY_MS)
      return () => clearTimeout(id)
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setTimeout(() => {
        if (!shouldSkip()) setShowAndroid(true)
      }, SHOW_DELAY_MS)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener)
  }, [])

  function dismiss() {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {/* ignore */}
    // Belt-and-braces: even if localStorage is wiped (iOS private mode, ITP),
    // sessionStorage stops the prompt from reappearing within the same tab.
    try { window.sessionStorage.setItem(SESSION_KEY, '1') } catch {/* ignore */}
    setShowAndroid(false)
    setShowIOS(false)
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    dismiss()
  }

  if (!showAndroid && !showIOS) return null

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:max-w-sm z-[60]">
      <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl shadow-2xl shadow-black/30 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[var(--text)] text-sm font-semibold">Install Clips N&rsquo;Cutz</p>
            {showAndroid ? (
              <p className="text-[var(--text-dim)] text-xs mt-1">
                Add to your home screen for a faster, app-like experience.
              </p>
            ) : (
              <p className="text-[var(--text-dim)] text-xs mt-1">
                Tap <span className="text-[var(--text)] font-semibold">Share</span> in Safari, then
                {' '}<span className="text-[var(--text)] font-semibold">Add to Home Screen</span>.
              </p>
            )}
          </div>
          <button onClick={dismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--elevated)] flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {showAndroid && (
          <div className="flex gap-2 mt-3">
            <button onClick={dismiss}
              className="flex-1 bg-[var(--elevated)] border border-[var(--border-strong)] text-[var(--text-muted)] font-medium py-2 rounded-lg text-xs">
              Not now
            </button>
            <button onClick={install}
              className="flex-1 bg-[var(--text)] text-[var(--bg)] font-semibold py-2 rounded-lg text-xs">
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
