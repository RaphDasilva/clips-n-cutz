import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'

// PATCH /api/owner/advances/[id]
// Body: { action: 'forgive' | 'restore' }
//   forgive — owner waives the advance; it stops counting against future payouts.
//   restore — re-mark a forgiven advance as outstanding (undo mistake).
// Only the owner can forgive.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.actualRole ?? session.role
  if (role !== 'owner') return NextResponse.json({ error: 'Only the owner can forgive an advance.' }, { status: 403 })

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
    // Block changing already-deducted advances — that money is gone.
    .neq('status', 'deducted')

  if (error) return NextResponse.json({ error: 'Failed to update advance.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
