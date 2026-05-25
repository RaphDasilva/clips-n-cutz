// Launch-week penalty grace.
// Through Sun 31 May 2026 (Lagos), every penalty written by the
// mark-absent cron or the manager attendance flow is forced to 0.
// Status (on_time / late / absent) is still recorded — we just
// don't dock the staff while they're learning the system.
//
// After this date the helper returns false and the normal tiered
// penalties resume automatically. No follow-up cleanup needed.
export const PENALTY_GRACE_UNTIL = '2026-05-31'

export function isWithinPenaltyGrace(lagosDateStr: string): boolean {
  return lagosDateStr <= PENALTY_GRACE_UNTIL
}
