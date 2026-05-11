'use client'

import { AuthGuard } from '@/components/auth-guard'
import { StaffSidebar, StaffMobileNav } from '@/components/staff-sidebar'
import type { SessionUser } from '@/types/database'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['staff']}>
      {(user: SessionUser) => (
        <div className="flex h-full bg-[#090909]">
          <StaffSidebar user={user} />
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            {children}
          </main>
          <StaffMobileNav />
        </div>
      )}
    </AuthGuard>
  )
}
