-- Snapshot the owner-only product cost (e.g. piercing earring) onto
-- each visit_service line at the time of the visit, the same way
-- price_ngn and commission_ngn are snapshotted. This lets the owner
-- see product revenue and lets staff see how each charge was split,
-- without depending on the live services.material_cost_ngn (which
-- can change later).

ALTER TABLE visit_services
  ADD COLUMN IF NOT EXISTS material_cost_ngn INTEGER NOT NULL DEFAULT 0;

-- No backfill: existing rows keep 0 so their stored commission and
-- the displayed split stay consistent. New visits snapshot the real
-- product cost going forward.
