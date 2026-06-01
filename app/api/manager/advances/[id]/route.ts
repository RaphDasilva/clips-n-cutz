import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'

// PATCH /api/manager/advances/[id]
// Body: { action: 'forgive' | 'restore' }
//   forgive — waive the advance; it stops counting against future payouts.
//   restore — re-mark a forgiven advance as outstanding (undo a mistake).
// Already-deducted advances cannot be changed — that money has moved.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json() as { action?: string }
  if (action !== 'forgive' && action !== 'restore') {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  }

  const supabase = createClient()
  const nextStatus = action === 'forgive' ? 'forgiven' : 'outstanding'
  const { error } = await supabase
    .from('staff_advances')
    .update({ status: nextStatus })
    .eq('id', id)
    .neq('status', 'deducted')

  if (error) return NextResponse.json({ error: 'Failed to update advance.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
