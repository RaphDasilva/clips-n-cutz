-- 029: Advance payment plans + partial repayment tracking.
--
-- weekly_cap_ngn — optional payment plan: the most that may be deducted
--   from any one weekly payout for this advance. NULL = no plan, the
--   whole outstanding balance is deducted at the next payout (old
--   behaviour).
-- repaid_ngn — how much of the advance has been recovered so far.
--   An advance stays 'outstanding' until repaid_ngn reaches amount_ngn,
--   then flips to 'deducted'.

ALTER TABLE staff_advances
  ADD COLUMN IF NOT EXISTS weekly_cap_ngn INTEGER CHECK (weekly_cap_ngn > 0),
  ADD COLUMN IF NOT EXISTS repaid_ngn INTEGER NOT NULL DEFAULT 0 CHECK (repaid_ngn >= 0);

-- Advances already fully deducted under the old one-shot behaviour.
UPDATE staff_advances SET repaid_ngn = amount_ngn WHERE status = 'deducted';

-- One row per partial (or full) deduction, linked to the payout that
-- carried it — the audit trail both sides can check.
CREATE TABLE IF NOT EXISTS advance_repayments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id  UUID NOT NULL REFERENCES staff_advances(id) ON DELETE CASCADE,
  payout_id   UUID REFERENCES staff_payouts(id) ON DELETE SET NULL,
  amount_ngn  INTEGER NOT NULL CHECK (amount_ngn > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advance_repayments_advance ON advance_repayments(advance_id);

ALTER TABLE advance_repayments ENABLE ROW LEVEL SECURITY;
