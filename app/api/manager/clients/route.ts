import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/types/database'

const PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q')?.trim() ?? ''
  const page   = Math.max(1, Number(searchParams.get('page') ?? '1') | 0)

  const supabase = createClient()

  if (search) {
    // Search bypasses pagination so matches are never split across pages.
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
      .order('created_at', { ascending: false })
      .limit(200) as { data: Client[] | null; error: { message: string } | null }

    if (error) {
      return NextResponse.json({ error: 'Failed to load clients.' }, { status: 500 })
    }
    return NextResponse.json({
      clients: data ?? [],
      total:   data?.length ?? 0,
      page:    1,
      pageSize: data?.length ?? 0,
    })
  }

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1
  const { data, error, count } = await supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to) as { data: Client[] | null; error: { message: string } | null; count: number | null }

  if (error) {
    return NextResponse.json({ error: 'Failed to load clients.' }, { status: 500 })
  }
  return NextResponse.json({
    clients:  data ?? [],
    total:    count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  })
}
