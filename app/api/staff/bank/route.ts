import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-server'

// Staff-self bank details for weekly payouts.
//   GET   — return the logged-in staff's stored bank details.
//   PATCH — save / update the logged-in staff's bank details.
// Only the staff themselves can read or write their own record.

export async function GET(req: NextRequest) {
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('bank_name, bank_account_number, bank_account_name')
    .eq('id', session.id)
    .single() as { data: { bank_name: string | null; bank_account_number: string | null; bank_account_name: string | null } | null; error: unknown }

  if (error || !data) return NextResponse.json({ error: 'Failed to load.' }, { status: 500 })

  return NextResponse.json({
    bankName:      data.bank_name,
    accountNumber: data.bank_account_number,
    accountName:   data.bank_account_name,
  })
}

export async function PATCH(req: NextRequest) {
  const token   = req.cookies.get(SESSION_COOKIE.name)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'staff') {
    return NextResponse.json({ error: 'Only staff can edit their own bank details.' }, { status: 403 })
  }

  const body = await req.json()
  const bankName: string | null = typeof body.bankName === 'string'
    ? (body.bankName.trim() || null) : null
  const accountNumber: string | null = typeof body.accountNumber === 'string'
    ? (body.accountNumber.replace(/\D/g, '').slice(0, 10) || null) : null
  const accountName: string | null = typeof body.accountName === 'string'
    ? (body.accountName.trim() || null) : null

  if (accountNumber && accountNumber.length !== 10) {
    return NextResponse.json({ error: 'Account number must be exactly 10 digits.' }, { status: 400 })
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('users')
    .update({
      bank_name:           bankName,
      bank_account_number: accountNumber,
      bank_account_name:   accountName,
    })
    .eq('id', session.id)

  if (error) return NextResponse.json({ error: 'Failed to save bank details.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
