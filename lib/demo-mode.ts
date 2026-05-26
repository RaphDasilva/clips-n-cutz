'use client'

import { useEffect, useState } from 'react'

// Demo mode replaces every client name + phone in the UI with a fake
// deterministic value. Use it to capture clean screenshots for the
// LVD Labs case study without leaking real client identities.
//
// Toggle on:  add ?demo=1 to any dashboard URL.
// Toggle off: add ?demo=0 to any dashboard URL, or close the tab.
//
// The flag lives in sessionStorage so it survives client-side
// navigation but never leaks past the current tab.

const STORAGE_KEY = 'cnc_demo_mode'

const FAKE_NAMES = [
  'Adaobi Okafor',  'Tunde Bello',     'Funke Adesina',  'Chinedu Eze',
  'Aisha Bello',    'Bayo Adekunle',   'Ngozi Okonkwo',  'Femi Adesanya',
  'Halima Ibrahim', 'Kemi Adeyemi',    'Olumide Coker',  'Yetunde Lawal',
  'Ifeoma Nwosu',   'Segun Olatunji',  'Bisi Akande',    'Tochi Madu',
  'Amaka Eze',      'Dapo Ogunleye',   'Zainab Yusuf',   'Emeka Obi',
]

const FAKE_PHONE = '+234 8XX XXX XXXX'

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function fakeName(seed: string): string {
  return FAKE_NAMES[hash(seed) % FAKE_NAMES.length]
}

export function useDemoMode(): boolean {
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const param = url.searchParams.get('demo')
      if (param === '1') {
        window.sessionStorage.setItem(STORAGE_KEY, '1')
        setDemo(true)
        return
      }
      if (param === '0') {
        window.sessionStorage.removeItem(STORAGE_KEY)
        setDemo(false)
        return
      }
      setDemo(window.sessionStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      setDemo(false)
    }
  }, [])

  return demo
}

export interface ClientMask {
  name: (n: string | null | undefined, fallback?: string) => string
  phone: (p: string | null | undefined) => string | null
}

export function useClientMask(): ClientMask {
  const demo = useDemoMode()
  return {
    name: (n, fallback = '—') => {
      if (!n) return fallback
      return demo ? fakeName(n) : n
    },
    phone: (p) => {
      if (!p) return null
      return demo ? FAKE_PHONE : p
    },
  }
}
