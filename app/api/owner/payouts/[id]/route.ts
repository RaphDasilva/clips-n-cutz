import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Unmark a payout — used if the owner accidentally records a
// payment or wants to re-do it. The locked-in figures are lost;
// the next view recomputes them from current visit/attendance data.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const { error } = await supabase
    .from('staff_payouts')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to unmark payout.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
