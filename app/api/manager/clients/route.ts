import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/types/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q')?.trim() ?? ''

  const supabase = createClient()

  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`).limit(200)
  } else {
    query = query.limit(1000)
  }

  const { data, error } = await query as { data: Client[] | null; error: { message: string } | null }

  if (error) {
    return NextResponse.json({ error: 'Failed to load clients.' }, { status: 500 })
  }

  return NextResponse.json({ clients: data ?? [] })
}
