'use client'

import { AuthGuard } from '@/components/auth-guard'
import { ManagerSidebar, MobileNav } from '@/components/manager-sidebar'
import type { SessionUser } from '@/types/database'

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['manager']}>
      {(user: SessionUser) => (
        <div className="flex h-full bg-[#090909]">
          {/* Desktop sidebar */}
          <ManagerSidebar user={user} />

          {/* Main content */}
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            {children}
          </main>

          {/* Mobile bottom nav */}
          <MobileNav />
        </div>
      )}
    </AuthGuard>
  )
}
