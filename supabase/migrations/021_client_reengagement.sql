-- ============================================================
-- 021_client_reengagement.sql
-- Clips N'Cutz Salon CRM — Track re-engagement messages sent to
--                          lapsed clients (30+ days dormant)
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- We send each lapsed client at most ONE "we miss you" message
-- per dormancy stretch. This table records that send so the
-- daily cron skips them on subsequent runs. Once the client
-- visits again, the row stops being relevant (next dormancy
-- stretch will produce a fresh row).
-- ============================================================

CREATE TABLE IF NOT EXISTS client_reengagements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_visit_at DATE NOT NULL,        -- snapshot of the visit that triggered the gap
  status        TEXT NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
  twilio_sid    TEXT,                 -- messaging provider id (jr 'msg_sid' name kept for symmetry)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_reengage_client ON client_reengagements(client_id, sent_at DESC);

ALTER TABLE client_reengagements ENABLE ROW LEVEL SECURITY;
