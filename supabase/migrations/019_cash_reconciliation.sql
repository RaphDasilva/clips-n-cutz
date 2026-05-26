-- ============================================================
-- 019_cash_reconciliation.sql
-- Clips N'Cutz Salon CRM — End-of-day cash drawer reconciliation
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- At close of business the manager counts the physical cash and
-- enters it. The system already knows what SHOULD be there from
-- today's cash visits, so any variance gets flagged. One row per
-- day; the manager can re-open and amend until next day rolls in.
-- ============================================================

CREATE TABLE IF NOT EXISTS cash_reconciliations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date         DATE NOT NULL UNIQUE,
  expected_ngn INTEGER NOT NULL,   -- sum of cash visits.total_ngn for the date
  actual_ngn   INTEGER NOT NULL,   -- physical count from the drawer
  variance_ngn INTEGER NOT NULL,   -- actual - expected (negative = short)
  notes        TEXT,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_recon_date ON cash_reconciliations(date DESC);

ALTER TABLE cash_reconciliations ENABLE ROW LEVEL SECURITY;
