-- ============================================================
-- 010_update_services.sql
-- Clips N'Cutz Salon CRM — Updated service menu
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- Replaces the initial 10 placeholder services with the real
-- 53-service menu, organised into 9 categories.
--
-- Existing services are deactivated (not deleted) to preserve
-- historical visit / commission data.
-- ============================================================

-- 1. Add category + sort_order columns
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS category   TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 2. Deactivate the old placeholder services
UPDATE services SET is_active = false;

-- 3. Insert the real service menu
INSERT INTO services (name, price_ngn, category, sort_order) VALUES
  -- ── Men's Haircut ───────────────────────────────────────────
  ('Cut',                              3500, 'Men''s Haircut', 11),
  ('Cut & Dye',                        6000, 'Men''s Haircut', 12),
  ('Cut & Relax',                      6000, 'Men''s Haircut', 13),
  ('Cut, Dye & Relax',                 8500, 'Men''s Haircut', 14),
  ('Shave',                            2000, 'Men''s Haircut', 15),
  ('Shave & Dye',                      4500, 'Men''s Haircut', 16),
  ('Shave, Dye & Relax',               7000, 'Men''s Haircut', 17),
  ('Dye',                              2500, 'Men''s Haircut', 18),
  ('Relax',                            2500, 'Men''s Haircut', 19),
  ('Wash',                             1500, 'Men''s Haircut', 20),

  -- ── Teenage ────────────────────────────────────────────────
  ('Cut',                              3000, 'Teenage',        21),
  ('Cut & Dye',                        5000, 'Teenage',        22),
  ('Cut & Relax',                      5000, 'Teenage',        23),
  ('Cut, Dye & Relax',                 7000, 'Teenage',        24),
  ('Shave',                            1500, 'Teenage',        25),
  ('Shave & Dye',                      3500, 'Teenage',        26),
  ('Dye',                              2000, 'Teenage',        27),
  ('Relax',                            2000, 'Teenage',        28),
  ('Wash',                             1000, 'Teenage',        29),

  -- ── Kids' Haircut ──────────────────────────────────────────
  ('Cut',                              2000, 'Kids'' Haircut', 31),
  ('Cut & Dye',                        3500, 'Kids'' Haircut', 32),
  ('Cut & Relax',                      3500, 'Kids'' Haircut', 33),
  ('Cut, Dye & Relax',                 5000, 'Kids'' Haircut', 34),
  ('Shave',                            1000, 'Kids'' Haircut', 35),
  ('Shave & Dye',                      2500, 'Kids'' Haircut', 36),
  ('Dye',                              1500, 'Kids'' Haircut', 37),
  ('Relax',                            1500, 'Kids'' Haircut', 38),
  ('Wash',                             1000, 'Kids'' Haircut', 39),

  -- ── Locs (prices are "from" — base prices) ────────────────
  ('Locking',                         35000, 'Locs',           41),
  ('Relocking',                       15000, 'Locs',           42),
  ('Styling',                          5000, 'Locs',           43),
  ('Washing',                          5000, 'Locs',           44),

  -- ── Tinting ───────────────────────────────────────────────
  ('Super White',                     15000, 'Tinting',        51),
  ('Gold',                            10000, 'Tinting',        52),
  ('Other Colours',                   15000, 'Tinting',        53),
  ('Adore',                           20000, 'Tinting',        54),

  -- ── Pedicure (Leg) ────────────────────────────────────────
  ('Plain Gel Paint on Natural Nails', 5000, 'Pedicure',       61),
  ('Plain Fixing All Toes',            7000, 'Pedicure',       62),
  ('Fixing Big Toe with Gel Paint',    6000, 'Pedicure',       63),
  ('Plain Acrylic on Leg',            10000, 'Pedicure',       64),

  -- ── Manicure (Hand) ───────────────────────────────────────
  ('Gel Paint on Natural Nails',       5000, 'Manicure',       71),
  ('Short Plain Gel Fixing',           8000, 'Manicure',       72),
  ('Medium Plain Gel Paint',          10000, 'Manicure',       73),
  ('Long Plain Gel Paint',            12000, 'Manicure',       74),
  ('Short Plain Acrylic',             15000, 'Manicure',       75),
  ('Medium Plain Acrylic',            18000, 'Manicure',       76),
  ('Long Plain Acrylic',              25000, 'Manicure',       77),
  ('Extra Long Plain Acrylic',        30000, 'Manicure',       78),

  -- ── BIAB ──────────────────────────────────────────────────
  ('Short Length Plain',              15000, 'BIAB',           81),
  ('Medium Length Plain',             20000, 'BIAB',           82),
  ('Long Length Plain',               25000, 'BIAB',           83),

  -- ── Nail Care ─────────────────────────────────────────────
  ('Soak Off',                         6000, 'Nail Care',      91),
  ('Refilling',                       10000, 'Nail Care',      92);

-- 4. Backfill: ensure old rows have a category (for safety)
UPDATE services
SET    category = 'Legacy'
WHERE  category IS NULL;
