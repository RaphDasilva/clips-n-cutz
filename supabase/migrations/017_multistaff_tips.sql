-- ============================================================
-- 017_multistaff_tips.sql
-- Clips N'Cutz Salon CRM — Multi-staff per visit + per-line tips
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- More than 30% of visits at Clips N'Cutz involve multiple staff
-- (washer + braider + nail tech). Today the walk-in/check-in
-- flows credit the single visit-level staff_id with every line
-- and every tip.
--
-- visit_services already carries its own staff_id (per migration
-- 003), so commission is fixable purely in the write paths. The
-- missing piece is tip allocation — tips live on visits.tip_ngn
-- and there's no way to express "₦500 to Akorede, ₦200 to Taiwo"
-- for one visit.
--
-- This migration adds tip_ngn to visit_services so tips can be
-- credited per-service-line. visits.tip_ngn stays as the
-- denormalised total per visit (used by owner summary tiles).
-- ============================================================

ALTER TABLE visit_services
  ADD COLUMN IF NOT EXISTS tip_ngn INTEGER NOT NULL DEFAULT 0;

-- Backfill: for every existing visit with a tip, drop it on the
-- earliest service line of that visit. Today every line in a
-- visit shares the same staff_id, so the staff still receives
-- their tip — the new query path just reads it from
-- visit_services instead of visits.
WITH first_vs AS (
  SELECT DISTINCT ON (visit_id) id, visit_id
  FROM   visit_services
  ORDER BY visit_id, created_at
)
UPDATE visit_services vs
SET    tip_ngn = v.tip_ngn
FROM   first_vs fvs
JOIN   visits   v ON v.id = fvs.visit_id
WHERE  vs.id = fvs.id
  AND  v.tip_ngn > 0;
