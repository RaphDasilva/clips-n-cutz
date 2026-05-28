-- Some services bundle a physical product the customer pays for
-- but which belongs 100% to the salon owner — e.g. piercing
-- includes a ₦3,000 earring on top of the ₦5,000 piercing service.
-- Staff commission (30%) must come only from the service portion,
-- never the product. material_cost_ngn is that owner-only product
-- amount; commission is computed on (price_ngn - material_cost_ngn).

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS material_cost_ngn INTEGER NOT NULL DEFAULT 0;

-- Piercing: ₦8,000 total = ₦3,000 earring (owner) + ₦5,000 service.
UPDATE services
SET    material_cost_ngn = 3000
WHERE  name = 'Piercing';
