'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { switchRole } from '@/lib/auth'
import type { SessionUser } from '@/types/database'

export function ImpersonationBanner({ user }: { user: SessionUser }) {
  const router = useRouter()
  const [switching, setSwitching] = useState(false)

  const isImpersonating = user.actualRole === 'owner' && user.role === 'manager'
  if (!isImpersonating) return null

  async function handleSwitchBack() {
    setSwitching(true)
    const result = await switchRole('owner')
    if (result) router.replace('/dashboard/owner')
    else setSwitching(false)
  }

  return (
    <div className="bg-[#C49A3C]/10 border-b border-[#C49A3C]/30 px-4 lg:px-10 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-4 h-4 text-[#C49A3C] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-[#C49A3C] text-xs sm:text-sm font-medium truncate">
          Viewing as Manager &middot; you are the Owner
        </p>
      </div>
      <button onClick={handleSwitchBack} disabled={switching}
        className="flex-shrink-0 text-[#C49A3C] text-xs font-semibold hover:underline disabled:opacity-40">
        {switching ? 'Switching…' : 'Switch back →'}
      </button>
    </div>
  )
}
