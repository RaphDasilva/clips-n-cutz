// Shared math for staff advances. Every route that previews or applies
// a payout deduction must use these so the numbers always agree.

export interface AdvanceBalance {
  amount_ngn:     number
  repaid_ngn:     number
  weekly_cap_ngn: number | null
}

// What the staff member still owes on this advance.
export function advanceRemaining(a: AdvanceBalance): number {
  return Math.max(0, a.amount_ngn - (a.repaid_ngn ?? 0))
}

// What the next weekly payout will deduct for this advance.
// With a payment plan (weekly_cap_ngn) the deduction is capped;
// without one the whole remaining balance is taken.
export function advanceWeeklyDeduction(a: AdvanceBalance): number {
  const remaining = advanceRemaining(a)
  return a.weekly_cap_ngn ? Math.min(a.weekly_cap_ngn, remaining) : remaining
}
