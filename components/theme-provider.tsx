'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContext {
  theme:       Theme
  setTheme:    (t: Theme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'cnc_theme'

const Ctx = createContext<ThemeContext | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    // Read on mount — the inline script in layout already applied
    // the right data-theme before paint, but state needs to mirror.
    const stored = (typeof window !== 'undefined'
      ? window.localStorage.getItem(STORAGE_KEY)
      : null) as Theme | null
    if (stored === 'light' || stored === 'dark') setThemeState(stored)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = t
      window.localStorage.setItem(STORAGE_KEY, t)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return <Ctx.Provider value={{ theme, setTheme, toggleTheme }}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}

// Inline script string. Drop into <head> via dangerouslySetInnerHTML
// so it runs before React hydration and the page never flashes the
// wrong theme.
export const NO_FLASH_SCRIPT = `
try {
  var t = localStorage.getItem('${STORAGE_KEY}');
  if (t === 'light' || t === 'dark') {
    document.documentElement.dataset.theme = t;
  } else {
    document.documentElement.dataset.theme = 'dark';
  }
} catch (e) { document.documentElement.dataset.theme = 'dark'; }
`.trim()
