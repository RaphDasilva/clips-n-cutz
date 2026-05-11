import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const days = parseInt(new URL(req.url).searchParams.get('days') ?? '7', 10)
  const n    = days === 30 ? 30 : 7

  const supabase = createClient()
  const today    = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })

  // Build the date range
  const start = new Date(today + 'T12:00:00')
  start.setDate(start.getDate() - (n - 1))
  const from = start.toLocaleDateString('en-CA')

  const { data, error } = await (supabase
    .from('visits')
    .select('visit_date, total_ngn')
    .gte('visit_date', from)
    .lte('visit_date', today) as unknown as Promise<{
      data: { visit_date: string; total_ngn: number }[] | null
      error: unknown
    }>)

  if (error) return NextResponse.json({ error: 'Failed to load chart data.' }, { status: 500 })

  // Sum revenue per day
  const map = new Map<string, number>()
  for (const row of (data ?? [])) {
    map.set(row.visit_date, (map.get(row.visit_date) ?? 0) + row.total_ngn)
  }

  // Fill every day in the range with 0 if no visits
  const points: { date: string; label: string; revenue: number }[] = []
  for (let i = 0; i < n; i++) {
    const d   = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - (n - 1 - i))
    const key = d.toLocaleDateString('en-CA')
    const label = d.toLocaleDateString('en-NG', {
      weekday: n <= 7 ? 'short' : undefined,
      day:     'numeric',
      month:   'short',
      timeZone: 'Africa/Lagos',
    })
    points.push({ date: key, label, revenue: map.get(key) ?? 0 })
  }

  return NextResponse.json({ points })
}
