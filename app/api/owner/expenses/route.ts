import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'

interface ExpenseRow {
  id: string
  date: string
  category: string
  amount_ngn: number
  vendor: string | null
  notes: string | null
  created_at: string
  users: { name: string } | null
}

// GET /api/owner/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD&category=...
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const params   = req.nextUrl.searchParams
  const from     = params.get('from')
  const to       = params.get('to')
  const category = params.get('category')
  const limit    = Math.min(500, Math.max(1, Number(params.get('limit') ?? 200)))

  let query = supabase
    .from('expenses')
    .select('id, date, category, amount_ngn, vendor, notes, created_at, users:recorded_by(name)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (from) query = query.gte('date', from)
  if (to)   query = query.lte('date', to)
  if (category) query = query.eq('category', category)

  const { data, error } = await query as unknown as { data: ExpenseRow[] | null; error: unknown }
  if (error) return NextResponse.json({ error: 'Failed to load expenses.' }, { status: 500 })

  const items = data ?? []
  const total = items.reduce((s, r) => s + r.amount_ngn, 0)

  // By category
  const byCategoryMap = new Map<string, number>()
  for (const r of items) byCategoryMap.set(r.category, (byCategoryMap.get(r.category) ?? 0) + r.amount_ngn)
  const byCategory = [...byCategoryMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  return NextResponse.json({ items, total, byCategory })
}

// POST /api/owner/expenses
// Body: { date?, category, amountNgn, vendor?, notes? }
export async function POST(req: NextRequest) {
  const body     = await req.json()
  const date     = typeof body.date     === 'string' ? body.date : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const amountNgn = Math.round(Number(body.amountNgn) || 0)
  const vendor   = typeof body.vendor === 'string' ? body.vendor.trim() || null : null
  const notes    = typeof body.notes  === 'string' ? body.notes.trim()  || null : null

  if (!category || amountNgn <= 0) {
    return NextResponse.json({ error: 'Category and a positive amount are required.' }, { status: 400 })
  }

  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null

  const supabase = createClient()
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      date, category, amount_ngn: amountNgn, vendor, notes,
      recorded_by: session?.id ?? null,
    })
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'Failed to record expense.' }, { status: 500 })
  return NextResponse.json({ expense: data }, { status: 201 })
}
