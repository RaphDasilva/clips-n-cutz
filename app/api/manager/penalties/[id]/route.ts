import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'

// PATCH /api/manager/penalties/[id]
// Body: { action: 'reverse' | 'restore' }
//   reverse — soft-deletes the penalty so it stops counting against
//             payouts. Audit trail preserved.
//   restore — undo a reverse (re-marks the penalty as active).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json() as { action?: string }
  if (action !== 'reverse' && action !== 'restore') {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  }

  const supabase = createClient()
  const update: Record<string, unknown> = {
    status:      action === 'reverse' ? 'reversed' : 'active',
    reversed_at: action === 'reverse' ? new Date().toISOString() : null,
    reversed_by: action === 'reverse' ? session.id : null,
  }

  const { error } = await supabase
    .from('manual_penalties')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to update penalty.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
