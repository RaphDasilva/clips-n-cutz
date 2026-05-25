-- ============================================================
-- 016_staff_payouts.sql
-- Clips N'Cutz Salon CRM — Weekly staff payouts
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- Salon pays staff every Sunday for the week just ended
-- (Monday → Sunday, Africa/Lagos). The owner is the one handing
-- out cash, so the workflow lives in the owner dashboard.
--
-- Each row locks in the breakdown at payment time, so later
-- edits to old visits don't change the historical payout total —
-- critical for dispute resolution.
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Inclusive week boundaries in Africa/Lagos time
  week_start      DATE NOT NULL,  -- Monday
  week_end        DATE NOT NULL,  -- Sunday

  -- Snapshot of components at payment time
  commission_ngn  INTEGER NOT NULL DEFAULT 0,
  tips_ngn        INTEGER NOT NULL DEFAULT 0,
  penalty_ngn     INTEGER NOT NULL DEFAULT 0,
  total_ngn       INTEGER NOT NULL DEFAULT 0,

  -- Payment metadata
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_by         UUID REFERENCES users(id),     -- the owner who marked it paid
  paid_amount_ngn INTEGER,                       -- in case the owner pays slightly different
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One payout per staff per week
  UNIQUE (staff_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_staff_payouts_staff_week
  ON staff_payouts(staff_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_staff_payouts_week
  ON staff_payouts(week_start DESC);

-- Lock down — same pattern as the rest of the app: only the
-- service_role (used by Next.js API routes) may touch this table.
ALTER TABLE staff_payouts ENABLE ROW LEVEL SECURITY;

-- Extend the WhatsApp message_type enum so the payday summary
-- the owner sends can be logged into whatsapp_messages.
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'payout_summary';
