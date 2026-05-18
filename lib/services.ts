import type { Service } from '@/types/database'

export interface ServiceGroup {
  category: string
  services: Service[]
}

// Groups services by category while preserving their existing order.
// Expects services to already be sorted by sort_order ASC from the API.
export function groupServicesByCategory(services: Service[]): ServiceGroup[] {
  const groups: ServiceGroup[] = []
  const byKey = new Map<string, ServiceGroup>()

  for (const s of services) {
    const key = s.category || 'Other'
    let group = byKey.get(key)
    if (!group) {
      group = { category: key, services: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    group.services.push(s)
  }

  return groups
}
