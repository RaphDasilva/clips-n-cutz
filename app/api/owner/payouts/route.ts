import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'
import { sendMessage } from '@/lib/messaging'

interface VisitServiceRow    { staff_id: string; commission_ngn: number; visits: { visit_date: string } | null }
interface VisitServiceTipRow { staff_id: string; tip_ngn: number; visits: { visit_date: string } | null }
interface AttendanceRow   { staff_id: string; penalty_ngn: number; date: string }
interface StaffRow        { id: string; name: string; is_active: boolean }
interface PayoutRow {
  id: string
  staff_id: string
  week_start: string
  week_end: string
  commission_ngn: number
  tips_ngn: number
  penalty_ngn: number
  total_ngn: number
  paid_at: string
  paid_by: string | null
  paid_amount_ngn: number | null
  notes: string | null
}

// ── Week boundaries in Africa/Lagos ──────────────────────────
function lagosToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

function weekBoundaries(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getUTCDay() // Sun = 0 … Sat = 6
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() + diffToMon)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end:   sunday.toISOString().slice(0, 10),
  }
}

// ── GET /api/owner/payouts?week=YYYY-MM-DD ───────────────────
// Returns per-staff breakdown for the given week. If `week` is
// omitted, defaults to the current Lagos week.
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const refDate  = req.nextUrl.searchParams.get('week') ?? lagosToday()
  const { start, end } = weekBoundaries(refDate)

  const [staffRes, vsRes, tipsRes, attRes, paidRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, is_active')
      .eq('role', 'staff')
      .eq('is_active', true)
      .order('name') as unknown as Promise<{ data: StaffRow[] | null; error: unknown }>,
    supabase
      .from('visit_services')
      .select('staff_id, commission_ngn, visits!inner(visit_date)')
      .gte('visits.visit_date', start)
      .lte('visits.visit_date', end) as unknown as Promise<{ data: VisitServiceRow[] | null; error: unknown }>,
    supabase
      .from('visit_services')
      .select('staff_id, tip_ngn, visits!inner(visit_date)')
      .gte('visits.visit_date', start)
      .lte('visits.visit_date', end) as unknown as Promise<{ data: VisitServiceTipRow[] | null; error: unknown }>,
    supabase
      .from('attendance')
      .select('staff_id, penalty_ngn, date')
      .gte('date', start)
      .lte('date', end) as unknown as Promise<{ data: AttendanceRow[] | null; error: unknown }>,
    supabase
      .from('staff_payouts')
      .select('*')
      .eq('week_start', start) as unknown as Promise<{ data: PayoutRow[] | null; error: unknown }>,
  ])

  if (staffRes.error || vsRes.error || tipsRes.error || attRes.error || paidRes.error) {
    return NextResponse.json({ error: 'Failed to load payout data.' }, { status: 500 })
  }

  const staff   = staffRes.data ?? []
  const paidMap = new Map<string, PayoutRow>()
  for (const p of paidRes.data ?? []) paidMap.set(p.staff_id, p)

  const commissionMap = new Map<string, number>()
  for (const r of vsRes.data ?? []) {
    commissionMap.set(r.staff_id, (commissionMap.get(r.staff_id) ?? 0) + (r.commission_ngn ?? 0))
  }

  const tipsMap = new Map<string, number>()
  for (const r of tipsRes.data ?? []) {
    tipsMap.set(r.staff_id, (tipsMap.get(r.staff_id) ?? 0) + (r.tip_ngn ?? 0))
  }

  const penaltyMap = new Map<string, number>()
  for (const r of attRes.data ?? []) {
    penaltyMap.set(r.staff_id, (penaltyMap.get(r.staff_id) ?? 0) + (r.penalty_ngn ?? 0))
  }

  const rows = staff.map(s => {
    const paid = paidMap.get(s.id)
    if (paid) {
      return {
        staffId:        s.id,
        staffName:      s.name,
        commission_ngn: paid.commission_ngn,
        tips_ngn:       paid.tips_ngn,
        penalty_ngn:    paid.penalty_ngn,
        total_ngn:      paid.total_ngn,
        status:         'paid' as const,
        paid_at:        paid.paid_at,
        paid_amount_ngn: paid.paid_amount_ngn,
        notes:          paid.notes,
        payoutId:       paid.id,
      }
    }
    const commission = commissionMap.get(s.id) ?? 0
    const tips       = tipsMap.get(s.id) ?? 0
    const penalty    = penaltyMap.get(s.id) ?? 0
    const total      = Math.max(0, commission + tips - penalty)
    return {
      staffId:        s.id,
      staffName:      s.name,
      commission_ngn: commission,
      tips_ngn:       tips,
      penalty_ngn:    penalty,
      total_ngn:      total,
      status:         'pending' as const,
      paid_at:        null,
      paid_amount_ngn: null,
      notes:          null,
      payoutId:       null,
    }
  })

  const summary = {
    totalCommission: rows.reduce((s, r) => s + r.commission_ngn, 0),
    totalTips:       rows.reduce((s, r) => s + r.tips_ngn,       0),
    totalPenalty:    rows.reduce((s, r) => s + r.penalty_ngn,    0),
    totalPayout:     rows.reduce((s, r) => s + r.total_ngn,      0),
    pendingCount:    rows.filter(r => r.status === 'pending').length,
    paidCount:       rows.filter(r => r.status === 'paid').length,
  }

  return NextResponse.json({ weekStart: start, weekEnd: end, rows, summary })
}

// ── POST /api/owner/payouts ──────────────────────────────────
// Body: { staffId, weekStart (YYYY-MM-DD), paidAmount?, notes? }
// Locks in the staff's earnings for that week.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const staffId: string = body.staffId
  const weekStart: string = body.weekStart
  const paidAmount = typeof body.paidAmount === 'number' ? body.paidAmount : null
  const notes: string | null = typeof body.notes === 'string' ? body.notes.trim() || null : null

  if (!staffId || !weekStart) {
    return NextResponse.json({ error: 'staffId and weekStart are required.' }, { status: 400 })
  }

  const { end: weekEnd } = weekBoundaries(weekStart)

  // Identify the caller (the owner) for the audit trail
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  const paidBy  = session?.actualRole === 'owner' || session?.role === 'owner' ? session.id : null

  const supabase = createClient()

  // Recompute totals server-side — never trust client numbers
  const [vsRes, tipsRes, attRes] = await Promise.all([
    supabase
      .from('visit_services')
      .select('commission_ngn, visits!inner(visit_date)')
      .eq('staff_id', staffId)
      .gte('visits.visit_date', weekStart)
      .lte('visits.visit_date', weekEnd) as unknown as Promise<{ data: { commission_ngn: number }[] | null; error: unknown }>,
    supabase
      .from('visit_services')
      .select('tip_ngn, visits!inner(visit_date)')
      .eq('staff_id', staffId)
      .gte('visits.visit_date', weekStart)
      .lte('visits.visit_date', weekEnd) as unknown as Promise<{ data: { tip_ngn: number }[] | null; error: unknown }>,
    supabase
      .from('attendance')
      .select('penalty_ngn')
      .eq('staff_id', staffId)
      .gte('date', weekStart)
      .lte('date', weekEnd) as unknown as Promise<{ data: { penalty_ngn: number }[] | null; error: unknown }>,
  ])

  if (vsRes.error || tipsRes.error || attRes.error) {
    return NextResponse.json({ error: 'Failed to compute payout.' }, { status: 500 })
  }

  const commission = (vsRes.data   ?? []).reduce((s, r) => s + (r.commission_ngn ?? 0), 0)
  const tips       = (tipsRes.data ?? []).reduce((s, r) => s + (r.tip_ngn        ?? 0), 0)
  const penalty    = (attRes.data  ?? []).reduce((s, r) => s + (r.penalty_ngn    ?? 0), 0)
  const total      = Math.max(0, commission + tips - penalty)

  const { data, error } = await supabase
    .from('staff_payouts')
    .insert({
      staff_id:        staffId,
      week_start:      weekStart,
      week_end:        weekEnd,
      commission_ngn:  commission,
      tips_ngn:        tips,
      penalty_ngn:     penalty,
      total_ngn:       total,
      paid_by:         paidBy,
      paid_amount_ngn: paidAmount ?? total,
      notes,
    })
    .select()
    .single() as { data: PayoutRow | null; error: { code?: string; message: string } | null }

  if (error || !data) {
    const dup = error?.code === '23505'
    return NextResponse.json(
      { error: dup ? 'This staff member has already been paid for this week.' : 'Failed to record payout.' },
      { status: dup ? 409 : 500 }
    )
  }

  // Fire-and-forget WhatsApp / SMS to the staff member with their breakdown
  notifyStaffPaid(supabase, staffId, data, notes).catch(err => console.error('Payout notify failed:', err))

  return NextResponse.json({ payout: data }, { status: 201 })
}

async function notifyStaffPaid(
  supabase: ReturnType<typeof createClient>,
  staffId: string,
  payout: PayoutRow,
  notes: string | null,
) {
  const { data: staff } = await supabase
    .from('users').select('name, phone').eq('id', staffId).single() as { data: { name: string; phone: string | null } | null; error: unknown }
  if (!staff?.phone) return

  const firstName = staff.name.split(' ')[0]
  const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`
  const weekLabel =
    `${new Date(payout.week_start + 'T12:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} – ` +
    `${new Date(payout.week_end   + 'T12:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`

  const lines = [
    `Hi ${firstName}! 💰`,
    ``,
    `Your weekly payout from *Clips N'Cutz* has been paid.`,
    ``,
    `📅 ${weekLabel}`,
    `✂️ Commission: ${fmt(payout.commission_ngn)}`,
    `💵 Tips:       ${fmt(payout.tips_ngn)}`,
  ]
  if (payout.penalty_ngn > 0) lines.push(`⚠️ Penalty:    -${fmt(payout.penalty_ngn)}`)
  lines.push(``)
  lines.push(`*Total paid: ${fmt(payout.paid_amount_ngn ?? payout.total_ngn)}*`)
  if (notes) lines.push(``, `Note: ${notes}`)
  lines.push(``)
  lines.push(`_Clips N'Cutz Unisex Salon, Lagos_`)

  const msg = lines.join('\n')
  const sid = await sendMessage(staff.phone, msg)

  await supabase.from('whatsapp_messages').insert({
    to_phone:     staff.phone,
    message_type: 'payout_summary',
    body:         msg,
    twilio_sid:   sid ?? undefined,
    status:       sid ? 'sent' : 'failed',
    sent_at:      new Date().toISOString(),
  })
}
