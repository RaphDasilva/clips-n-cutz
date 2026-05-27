import { headers } from 'next/headers'

// Returns true when the current API request was made against a
// localhost dev server. Used to gate demo-only data (e.g. the
// "TEST" staff member) so it never leaks into the production
// Supabase responses Cajetan and the team actually use.
export async function isLocalRequest(): Promise<boolean> {
  try {
    const h    = await headers()
    const host = h.get('host') ?? ''
    return host.startsWith('localhost')
        || host.startsWith('127.0.0.1')
        || host.startsWith('0.0.0.0')
  } catch {
    return false
  }
}

// Name prefix that marks a row as demo-only. Case-insensitive
// match via ILIKE; anything starting with "TEST" (TEST, Test1,
// test_x, etc.) is treated as demo data.
export const DEMO_STAFF_PREFIX = 'TEST'

// Returns true if a name looks like a demo / test staff record.
// Used after a join when Supabase can't filter the joined row
// before it arrives.
export function isDemoStaffName(name: string | null | undefined): boolean {
  if (!name) return false
  return name.toUpperCase().startsWith(DEMO_STAFF_PREFIX)
}
