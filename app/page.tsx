'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, getDashboardPath } from '@/lib/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const session = getSession()
    if (session) {
      router.replace(getDashboardPath(session.role))
    } else {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
    </div>
  )
}
