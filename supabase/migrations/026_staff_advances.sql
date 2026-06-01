-- Staff advances / loans. Owner gives a staff member money mid-week
-- (e.g. ₦5,000 cash for an emergency) and that amount is recorded
-- here. The next weekly payout automatically deducts outstanding
-- advances, building trust because both sides see the same number.

CREATE TABLE IF NOT EXISTS staff_advances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ngn      INTEGER NOT NULL CHECK (amount_ngn > 0),
  reason          TEXT,
  given_at        DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date,
  given_by        UUID REFERENCES users(id),       -- owner / manager who granted it

  -- Lifecycle. 'outstanding' = still owed by the staff.
  -- 'deducted'    = fully recovered from a weekly payout (linked).
  -- 'forgiven'    = owner waived it; not counted against payouts.
  status          TEXT NOT NULL DEFAULT 'outstanding'
    CHECK (status IN ('outstanding', 'deducted', 'forgiven')),
  deducted_at     TIMESTAMPTZ,
  deducted_payout_id UUID REFERENCES staff_payouts(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_advances_staff   ON staff_advances(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_advances_status  ON staff_advances(status);

ALTER TABLE staff_advances ENABLE ROW LEVEL SECURITY;
