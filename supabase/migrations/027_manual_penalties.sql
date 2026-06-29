-- Manual penalties — manager imposes a penalty for non-attendance
-- reasons (phone use during work, damaged equipment, late opening,
-- rude to a client, etc.). Different from the automatic
-- attendance.penalty_ngn that the cron + check-in flow stamp.
-- These deduct from the staff's next weekly payout, identically to
-- attendance penalties. Staff sees them itemised with the reason
-- on their dashboard so it's never a surprise.

CREATE TABLE IF NOT EXISTS manual_penalties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ngn  INTEGER NOT NULL CHECK (amount_ngn > 0),
  reason      TEXT   NOT NULL,
  given_at    DATE   NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date,
  given_by    UUID   REFERENCES users(id),  -- manager / owner who issued it

  -- Lifecycle. 'active' counts against the week containing given_at.
  -- 'reversed' is a soft-delete — keeps the audit trail but excludes
  -- the row from any payout math.
  status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'reversed')),
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES users(id),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_penalties_staff   ON manual_penalties(staff_id);
CREATE INDEX IF NOT EXISTS idx_manual_penalties_date    ON manual_penalties(given_at);
CREATE INDEX IF NOT EXISTS idx_manual_penalties_status  ON manual_penalties(status);

ALTER TABLE manual_penalties ENABLE ROW LEVEL SECURITY;
