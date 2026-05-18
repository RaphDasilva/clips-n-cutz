import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/types/database'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order') as { data: Service[] | null; error: unknown }

  if (error) return NextResponse.json({ error: 'Failed to load services.' }, { status: 500 })
  return NextResponse.json({ services: data ?? [] })
}
