-- ============================================================
-- 012_login_lockout_and_rate_limit.sql
-- Clips N'Cutz Salon CRM — Brute-force protection
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- Adds two protections:
--
-- 1. PIN brute-force lockout — tracked on the users table.
--    After 5 failed PIN attempts the account is locked for 15
--    minutes (pin_locked_until). A successful login resets the
--    counter.
--
-- 2. Booking endpoint rate limit — a new booking_rate_limit
--    table records every booking attempt by IP. /api/book
--    queries it to cap each IP at N bookings per hour.
-- ============================================================

-- ── PIN lockout columns ─────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_pin_attempts INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until    TIMESTAMPTZ;

-- ── Booking rate-limit table ────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_rate_limit (
  id         BIGSERIAL PRIMARY KEY,
  ip         TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_rate_limit_ip_created_at_idx
  ON booking_rate_limit (ip, created_at DESC);

-- Lock it down — same pattern as the rest of the app:
-- only the service_role (used by API routes) may read or write.
ALTER TABLE booking_rate_limit ENABLE ROW LEVEL SECURITY;
