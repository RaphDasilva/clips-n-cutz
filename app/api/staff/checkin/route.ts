import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body     = await req.json()
  const staffId  = (body.staffId ?? '').trim() as string

  if (!staffId) {
    return NextResponse.json({ error: 'staffId required.' }, { status: 400 })
  }

  const supabase = createClient()
  const today    = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })

  // If attendance already confirmed today, reject
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('staff_id', staffId)
    .eq('date', today)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already checked in today.' }, { status: 409 })
  }

  // Upsert request — if they tap again it just refreshes requested_at
  const { error } = await supabase
    .from('checkin_requests')
    .upsert(
      { staff_id: staffId, date: today, requested_at: new Date().toISOString(), status: 'pending' },
      { onConflict: 'staff_id,date' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
