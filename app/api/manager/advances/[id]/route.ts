import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'

// PATCH /api/manager/advances/[id]
// Body: { action: 'forgive' | 'restore' | 'edit_amount' | 'set_plan', ... }
//   forgive      — waive the advance; it stops counting against future payouts.
//   restore      — re-mark a forgiven advance as outstanding (undo a mistake).
//   edit_amount  — { amountNgn } correct the amount (mistake / change of mind).
//                  Never below what has already been repaid.
//   set_plan     — { weeklyCapNgn: number | null } set or clear the payment
//                  plan: the most deducted from any one weekly payout.
// Already-deducted advances cannot be changed — that money has moved.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { action?: string; amountNgn?: unknown; weeklyCapNgn?: unknown }
  const supabase = createClient()

  if (body.action === 'forgive' || body.action === 'restore') {
    const nextStatus = body.action === 'forgive' ? 'forgiven' : 'outstanding'
    const { error } = await supabase
      .from('staff_advances')
      .update({ status: nextStatus })
      .eq('id', id)
      .neq('status', 'deducted')
    if (error) return NextResponse.json({ error: 'Failed to update advance.' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.action === 'edit_amount' || body.action === 'set_plan') {
    const { data: adv } = await supabase
      .from('staff_advances')
      .select('id, amount_ngn, repaid_ngn, status')
      .eq('id', id)
      .single() as { data: { id: string; amount_ngn: number; repaid_ngn: number; status: string } | null }
    if (!adv) return NextResponse.json({ error: 'Advance not found.' }, { status: 404 })
    if (adv.status === 'deducted') {
      return NextResponse.json({ error: 'This advance is fully repaid and can no longer be changed.' }, { status: 400 })
    }

    if (body.action === 'edit_amount') {
      const amountNgn = Math.round(Number(body.amountNgn) || 0)
      if (amountNgn <= 0) {
        return NextResponse.json({ error: 'Enter an amount above ₦0.' }, { status: 400 })
      }
      if (amountNgn <= (adv.repaid_ngn ?? 0)) {
        return NextResponse.json(
          { error: `₦${(adv.repaid_ngn ?? 0).toLocaleString('en-NG')} has already been repaid — the new amount must be higher than that. To cancel the rest, use Forgive instead.` },
          { status: 400 }
        )
      }
      const { error } = await supabase.from('staff_advances').update({ amount_ngn: amountNgn }).eq('id', id)
      if (error) return NextResponse.json({ error: 'Failed to update amount.' }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    // set_plan
    const raw = body.weeklyCapNgn
    const weeklyCapNgn = raw === null || raw === undefined || raw === '' ? null : Math.round(Number(raw) || 0)
    if (weeklyCapNgn !== null && weeklyCapNgn <= 0) {
      return NextResponse.json({ error: 'Weekly deduction must be above ₦0, or empty to remove the plan.' }, { status: 400 })
    }
    const { error } = await supabase.from('staff_advances').update({ weekly_cap_ngn: weeklyCapNgn }).eq('id', id)
    if (error) return NextResponse.json({ error: 'Failed to update payment plan.' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}
