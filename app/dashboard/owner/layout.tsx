'use client'

import { AuthGuard } from '@/components/auth-guard'
import { OwnerSidebar, OwnerMobileNav } from '@/components/owner-sidebar'
import type { SessionUser } from '@/types/database'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['owner']}>
      {(user: SessionUser) => (
        <div className="flex h-full bg-[var(--bg)]">
          <OwnerSidebar user={user} />
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            {children}
          </main>
          <OwnerMobileNav />
        </div>
      )}
    </AuthGuard>
  )
}
