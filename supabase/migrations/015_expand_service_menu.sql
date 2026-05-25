-- ============================================================
-- 015_expand_service_menu.sql
-- Clips N'Cutz Salon CRM — Major service menu expansion
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- Adds ~81 services across 8 new categories plus 5 new Locs
-- services alongside the existing ones. Existing rows remain
-- untouched (the manager can deactivate any duplicates).
--
-- Categories added:
--   Men's Hair, Kids' Natural Hair, Kids' Relaxed Hair, Wigs,
--   Women's Natural Hair, Women's Relaxed Hair, Hair Loosing,
--   Pedi & Mani
-- Plus extra rows in the existing Locs category.
-- ============================================================

INSERT INTO services (name, price_ngn, category, sort_order) VALUES

  -- ── Men's Hair (styling — distinct from "Men's Haircut") ──
  ('Washing',                       4000, 'Men''s Hair',            101),
  ('Weave',                         8000, 'Men''s Hair',            102),
  ('Weave with Designs',           10000, 'Men''s Hair',            103),
  ('Stitch Braids',                15000, 'Men''s Hair',            104),
  ('Big Twist with Hair',          14000, 'Men''s Hair',            105),
  ('Medium Twist with Hair',       20000, 'Men''s Hair',            106),
  ('Small Twist with Hair',        28000, 'Men''s Hair',            107),
  ('Twist with Extension',         25000, 'Men''s Hair',            108),

  -- ── Kids' Natural Hair ───────────────────────────────────
  ('Washing',                       4000, 'Kids'' Natural Hair',    111),
  ('Weaving',                       6000, 'Kids'' Natural Hair',    112),
  ('Tiny Weaving',                  9000, 'Kids'' Natural Hair',    113),
  ('Big Braids',                   16000, 'Kids'' Natural Hair',    114),
  ('Medium Braids',                25000, 'Kids'' Natural Hair',    115),
  ('Small Braids',                 35000, 'Kids'' Natural Hair',    116),

  -- ── Kids' Relaxed Hair ───────────────────────────────────
  ('Washing',                       3000, 'Kids'' Relaxed Hair',    121),
  ('Weaving',                       5000, 'Kids'' Relaxed Hair',    122),
  ('Tiny Weaving',                  8000, 'Kids'' Relaxed Hair',    123),
  ('Big Braids',                   12000, 'Kids'' Relaxed Hair',    124),
  ('Medium Braids',                20000, 'Kids'' Relaxed Hair',    125),
  ('Small Braids',                 30000, 'Kids'' Relaxed Hair',    126),

  -- ── Wigs ─────────────────────────────────────────────────
  ('Straightening Short Wig',       6000, 'Wigs',                   131),
  ('Straightening Long Wig',        8000, 'Wigs',                   132),
  ('Curling',                      10000, 'Wigs',                   133),
  ('Heatless Curls',               15000, 'Wigs',                   134),
  ('Installation Straight Hair',   20000, 'Wigs',                   135),
  ('Installation Curly Hair',      30000, 'Wigs',                   136),
  ('Wigging',                      18000, 'Wigs',                   137),
  ('Straight Wig Revamp — Short',  10000, 'Wigs',                   138),
  ('Straight Wig Revamp — Long',   12000, 'Wigs',                   139),
  ('Curly Wig Revamp',             15000, 'Wigs',                   140),
  ('Heatless Curl Revamp',         20000, 'Wigs',                   141),

  -- ── Women's Natural Hair ─────────────────────────────────
  ('Washing',                       5000, 'Women''s Natural Hair',  151),
  ('Weave',                         5000, 'Women''s Natural Hair',  152),
  ('Stitch',                       20000, 'Women''s Natural Hair',  153),
  ('Big Twist',                    14000, 'Women''s Natural Hair',  154),
  ('Medium Twist',                 20000, 'Women''s Natural Hair',  155),
  ('Small Twist',                  30000, 'Women''s Natural Hair',  156),
  ('Steaming',                     20000, 'Women''s Natural Hair',  157),
  ('Treatment',                     4000, 'Women''s Natural Hair',  158),
  ('Ponytail',                     25000, 'Women''s Natural Hair',  159),
  ('Sew-in Straight Hair',         25000, 'Women''s Natural Hair',  160),
  ('Sew-in Curly Hair',            30000, 'Women''s Natural Hair',  161),
  ('Big Braids',                   25000, 'Women''s Natural Hair',  162),
  ('Medium Braids',                40000, 'Women''s Natural Hair',  163),
  ('Small Braids',                 60000, 'Women''s Natural Hair',  164),
  ('Big Ghana Weave',              20000, 'Women''s Natural Hair',  165),
  ('Medium Ghana Weave',           30000, 'Women''s Natural Hair',  166),
  ('Small Ghana Weave',            40000, 'Women''s Natural Hair',  167),

  -- ── Women's Relaxed Hair ─────────────────────────────────
  ('Washing',                       4000, 'Women''s Relaxed Hair',  171),
  ('Weave',                         4000, 'Women''s Relaxed Hair',  172),
  ('Steaming',                     15000, 'Women''s Relaxed Hair',  173),
  ('Treatment',                     3000, 'Women''s Relaxed Hair',  174),
  ('Relaxing',                      8000, 'Women''s Relaxed Hair',  175),
  ('Pixie Styling',                20000, 'Women''s Relaxed Hair',  176),
  ('Straightening',                10000, 'Women''s Relaxed Hair',  177),
  ('Ponytail',                     20000, 'Women''s Relaxed Hair',  178),
  ('Big Twist',                    10000, 'Women''s Relaxed Hair',  179),
  ('Medium Twist',                 16000, 'Women''s Relaxed Hair',  180),
  ('Small Twist',                  22000, 'Women''s Relaxed Hair',  181),
  ('Big Braids',                   20000, 'Women''s Relaxed Hair',  182),
  ('Medium Braids',                40000, 'Women''s Relaxed Hair',  183),
  ('Small Braids',                 50000, 'Women''s Relaxed Hair',  184),
  ('Big Ghana Weave',              17000, 'Women''s Relaxed Hair',  185),
  ('Medium Ghana Weave',           22000, 'Women''s Relaxed Hair',  186),
  ('Small Ghana Weave',            30000, 'Women''s Relaxed Hair',  187),

  -- ── Hair Loosing (removing extensions/braids) ────────────
  ('Weave',                         3000, 'Hair Loosing',           191),
  ('Twist',                         5000, 'Hair Loosing',           192),
  ('Big Braids',                    6000, 'Hair Loosing',           193),
  ('Medium Braids',                 9000, 'Hair Loosing',           194),
  ('Small Braids',                 13000, 'Hair Loosing',           195),

  -- ── Pedi & Mani (simpler nail menu, separate from detailed Manicure/Pedicure) ──
  ('Pedicure',                     15000, 'Pedi & Mani',            201),
  ('Manicure',                      7000, 'Pedi & Mani',            202),
  ('Transparent Gel Polish',        5000, 'Pedi & Mani',            203),
  ('Colored Gel Polish',            6000, 'Pedi & Mani',            204),
  ('Nails Cleaning',                5000, 'Pedi & Mani',            205),
  ('Piercing',                      8000, 'Pedi & Mani',            206),

  -- ── Locs (new prices, alongside existing entries) ────────
  ('Washing',                       5000, 'Locs',                    45),
  ('Styling',                       5000, 'Locs',                    46),
  ('Locking (Premium)',            60000, 'Locs',                    47),
  ('Relocking Short Hair',         25000, 'Locs',                    48),
  ('Relocking Long Hair',          35000, 'Locs',                    49);
