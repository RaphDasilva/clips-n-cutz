import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ClientLast {
  id: string
  name: string
  phone: string | null
  last_visit: string
}

// Returns clients whose most recent visit was >= 30 days ago.
// Includes the last-visit date so the owner can prioritise.
// Excludes clients with no phone (can't re-engage them anyway).
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const threshold = Number(req.nextUrl.searchParams.get('days') ?? 30)

  // Pull clients with phone + their most recent visit_date
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, visits(visit_date)')
    .not('phone', 'is', null)
    .order('name') as unknown as {
      data: { id: string; name: string; phone: string | null; visits: { visit_date: string }[] }[] | null
      error: unknown
    }

  if (error) return NextResponse.json({ error: 'Failed to load clients.' }, { status: 500 })

  const todayMs    = Date.parse(new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }))
  const lapsed: ClientLast[] = []

  for (const c of (data ?? [])) {
    if (!c.visits || c.visits.length === 0) continue
    const lastDate = c.visits.map(v => v.visit_date).sort().slice(-1)[0]
    if (!lastDate) continue
    const ageDays = Math.floor((todayMs - Date.parse(lastDate)) / 86400000)
    if (ageDays >= threshold) {
      lapsed.push({ id: c.id, name: c.name, phone: c.phone, last_visit: lastDate })
    }
  }

  lapsed.sort((a, b) => a.last_visit.localeCompare(b.last_visit))

  return NextResponse.json({ lapsed, threshold })
}
