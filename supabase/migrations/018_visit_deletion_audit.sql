-- ============================================================
-- 018_visit_deletion_audit.sql
-- Clips N'Cutz Salon CRM — Audit log for visit deletions
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- The manager can delete same-day walk-ins to correct mistakes,
-- but the owner needs visibility: how often, what was wiped,
-- and (ideally) why. This table snapshots the visit at deletion
-- time so the record survives even though the original rows are
-- gone, and tracks owner acknowledgement so the alert banner can
-- stop nagging once it's been seen.
-- ============================================================

CREATE TABLE IF NOT EXISTS visit_deletions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Original visit identity (no FK — the visit is gone)
  original_visit_id UUID NOT NULL,

  -- Snapshot
  client_name       TEXT,
  client_phone      TEXT,
  staff_name        TEXT,
  visit_date        DATE NOT NULL,
  total_ngn         INTEGER NOT NULL,
  tip_ngn           INTEGER NOT NULL DEFAULT 0,
  payment_method    TEXT,
  service_names     TEXT[]  NOT NULL DEFAULT '{}',

  -- Reason
  reason            TEXT,   -- 'duplicate', 'wrong_client', 'wrong_amount', 'other'
  reason_note       TEXT,

  -- Audit metadata
  deleted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by        UUID REFERENCES users(id),

  -- Owner acknowledgement
  acknowledged_at   TIMESTAMPTZ,
  acknowledged_by   UUID REFERENCES users(id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_deletions_deleted_at
  ON visit_deletions(deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_visit_deletions_unack
  ON visit_deletions(acknowledged_at) WHERE acknowledged_at IS NULL;

ALTER TABLE visit_deletions ENABLE ROW LEVEL SECURITY;
