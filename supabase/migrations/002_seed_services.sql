-- ============================================================
-- 002_seed_services.sql
-- Clips N'Cutz Salon CRM — Service Menu Seed Data
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- Run this AFTER 001_initial_schema.sql
-- ============================================================

INSERT INTO services (name, price_ngn) VALUES
  ('Barbing',              3500),
  ('Barb & Dye',           6000),
  ('Hair Washing',         4000),
  ('Revamping',            7000),
  ('Braids',              10000),
  ('Pedicure & Manicure', 20000),
  ('Stitches',            12000),
  ('Tint',                15000),
  ('Facials',             40000),
  ('Dread',               60000);
