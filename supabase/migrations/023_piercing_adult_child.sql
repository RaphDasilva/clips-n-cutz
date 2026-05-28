-- Two piercing types. Both include the same ₦3,000 earring, which
-- is the salon owner's product (no commission). Only the service
-- portion is commissionable (30%).
--   Adults:   ₦8,000 total = ₦5,000 service + ₦3,000 earring
--   Children: ₦7,000 total = ₦4,000 service + ₦3,000 earring

-- Self-contained: ensure the product-cost column exists even if
-- migration 022 wasn't run first.
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS material_cost_ngn INTEGER NOT NULL DEFAULT 0;

-- Existing single "Piercing" becomes the adult variant.
UPDATE services SET name = 'Piercing (Adults)' WHERE name = 'Piercing';
UPDATE services
SET    price_ngn = 8000, material_cost_ngn = 3000
WHERE  name = 'Piercing (Adults)';

-- Add the children variant in the same category, right after adults.
INSERT INTO services (name, price_ngn, material_cost_ngn, category, sort_order, is_active)
SELECT 'Piercing (Children)', 7000, 3000, s.category, s.sort_order + 1, true
FROM   services s
WHERE  s.name = 'Piercing (Adults)'
  AND  NOT EXISTS (SELECT 1 FROM services WHERE name = 'Piercing (Children)');
