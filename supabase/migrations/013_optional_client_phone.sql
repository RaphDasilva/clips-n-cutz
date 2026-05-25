-- ============================================================
-- 013_optional_client_phone.sql
-- Clips N'Cutz Salon CRM — Phone optional on walk-in clients
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- Many walk-ins don't share a phone number. The form has to
-- accept anonymous clients while still preventing duplicate
-- entries when a real phone IS provided.
--
-- Approach: make clients.phone nullable + replace the full
-- UNIQUE constraint with a partial unique index that only
-- enforces uniqueness on non-NULL phone values.
-- ============================================================

ALTER TABLE clients ALTER COLUMN phone DROP NOT NULL;

DROP INDEX IF EXISTS clients_phone_key;

CREATE UNIQUE INDEX IF NOT EXISTS clients_phone_unique_not_null
  ON clients(phone) WHERE phone IS NOT NULL;
