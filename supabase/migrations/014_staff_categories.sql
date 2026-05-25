-- ============================================================
-- 014_staff_categories.sql
-- Clips N'Cutz Salon CRM — Staff assignments by category
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- Previously staff_services linked each staff member to specific
-- service IDs (53 rows possible per staff). Managing this from
-- the team UI was tedious. We're moving to category-level
-- assignment: 9 categories, picked as checkboxes. The walk-in
-- filter still works on individual service IDs — the API now
-- derives the allowed service IDs from the staff's assigned
-- categories on every read, so the front-end keeps using the
-- same shape it already does.
--
-- We keep the staff_services table around for now (just stop
-- writing to it) so we can roll back without data loss. It will
-- be dropped in a follow-up migration once confidence is high.
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_categories (
  staff_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  PRIMARY KEY (staff_id, category)
);

CREATE INDEX IF NOT EXISTS idx_staff_categories_staff
  ON staff_categories(staff_id);

-- Backfill: derive each staff's categories from their existing
-- per-service assignments. Skip the legacy bucket so old test
-- data doesn't leak through.
INSERT INTO staff_categories (staff_id, category)
SELECT DISTINCT ss.staff_id, s.category
FROM   staff_services ss
JOIN   services        s ON s.id = ss.service_id
WHERE  s.category IS NOT NULL
  AND  s.category <> 'Legacy'
ON CONFLICT DO NOTHING;

-- Lock down — same pattern as the rest of the app: only the
-- service_role (used by Next.js API routes) may touch this table.
ALTER TABLE staff_categories ENABLE ROW LEVEL SECURITY;
