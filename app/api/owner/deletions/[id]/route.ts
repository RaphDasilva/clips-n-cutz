import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'

// Mark a deletion as acknowledged by the owner so it stops
// showing in the home-page banner. Pass { acknowledged: false }
// to undo (e.g. owner accidentally dismissed before reviewing).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({})) as { acknowledged?: boolean }
  const ack  = body.acknowledged !== false

  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null

  const supabase = createClient()
  const { error } = await supabase
    .from('visit_deletions')
    .update({
      acknowledged_at: ack ? new Date().toISOString() : null,
      acknowledged_by: ack ? (session?.id ?? null) : null,
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update deletion.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
