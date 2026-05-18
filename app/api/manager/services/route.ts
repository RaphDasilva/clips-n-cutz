import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/types/database'

export async function GET(req: NextRequest) {
  const supabase        = createClient()
  const includeInactive = req.nextUrl.searchParams.get('include_inactive') === 'true'

  let query = supabase.from('services').select('*').order('sort_order')
  if (!includeInactive) query = query.eq('is_active', true)

  const { data, error } = await query as { data: Service[] | null; error: { message: string } | null }

  if (error) {
    return NextResponse.json({ error: 'Failed to load services.' }, { status: 500 })
  }

  return NextResponse.json({ services: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body         = await req.json()
  const name: string     = (body.name     ?? '').trim()
  const category: string = (body.category ?? '').trim()
  const priceNgn         = Number(body.priceNgn)
  const sortOrder        = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 999

  if (!name || !category) {
    return NextResponse.json({ error: 'Service name and category are required.' }, { status: 400 })
  }
  if (!Number.isFinite(priceNgn) || priceNgn < 0) {
    return NextResponse.json({ error: 'Price must be a positive number.' }, { status: 400 })
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('services')
    .insert({
      name,
      category,
      price_ngn: Math.round(priceNgn),
      sort_order: sortOrder,
      is_active: true,
    })
    .select()
    .single() as { data: Service | null; error: { message: string } | null }

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create service.' }, { status: 500 })
  }

  return NextResponse.json({ service: data }, { status: 201 })
}
