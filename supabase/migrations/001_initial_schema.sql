-- ============================================================
-- 001_initial_schema.sql
-- Clips N'Cutz Salon CRM — Initial Database Schema
-- Built by LVD Labs · lvdlabs.io
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff');

CREATE TYPE appointment_status AS ENUM (
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE booking_source AS ENUM ('online', 'walkin', 'phone');

CREATE TYPE followup_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'cancelled'
);

CREATE TYPE message_type AS ENUM (
  'booking_confirmation',
  'reminder_24h',
  'reminder_2h',
  'followup_7day'
);

-- ============================================================
-- TABLES
-- ============================================================

-- 1. users
-- Every person who can log in: owner, manager, and all staff.
-- We never delete a user — set is_active = false instead.
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT UNIQUE NOT NULL,
  pin_hash        TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'staff',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  must_change_pin BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. clients
-- Every person who has visited the salon (walk-in or booked).
CREATE TABLE clients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  phone      TEXT UNIQUE NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. services
-- The menu of services the salon offers with prices in Naira.
CREATE TABLE services (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  price_ngn  INTEGER NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. appointments
-- A pre-booked slot. Becomes a visit when completed.
CREATE TABLE appointments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id),
  staff_id     UUID REFERENCES users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status       appointment_status NOT NULL DEFAULT 'pending',
  source       booking_source NOT NULL DEFAULT 'online',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. appointment_services
-- Which services were requested when the appointment was booked.
CREATE TABLE appointment_services (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id     UUID NOT NULL REFERENCES services(id)
);

-- 6. visits
-- One completed salon visit. Walk-ins have no appointment_id.
CREATE TABLE visits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES clients(id),
  staff_id       UUID NOT NULL REFERENCES users(id),
  appointment_id UUID REFERENCES appointments(id),
  visit_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT,
  total_ngn      INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. visit_services
-- Each individual service performed within a visit.
-- price_ngn is a snapshot so price changes don't alter history.
-- commission_ngn is always exactly 30% of price_ngn.
CREATE TABLE visit_services (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id       UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  service_id     UUID NOT NULL REFERENCES services(id),
  staff_id       UUID NOT NULL REFERENCES users(id),
  price_ngn      INTEGER NOT NULL,
  commission_ngn INTEGER NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. follow_ups
-- A WhatsApp follow-up message scheduled 7 days after a visit.
CREATE TABLE follow_ups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id),
  visit_id      UUID NOT NULL REFERENCES visits(id),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at       TIMESTAMPTZ,
  status        followup_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. whatsapp_messages
-- A log of every WhatsApp message sent through Twilio.
CREATE TABLE whatsapp_messages (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_phone               TEXT NOT NULL,
  message_type           message_type NOT NULL,
  body                   TEXT NOT NULL,
  related_appointment_id UUID REFERENCES appointments(id),
  related_visit_id       UUID REFERENCES visits(id),
  twilio_sid             TEXT,
  status                 TEXT NOT NULL DEFAULT 'pending',
  sent_at                TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- appointments
CREATE INDEX idx_appointments_client_id    ON appointments(client_id);
CREATE INDEX idx_appointments_staff_id     ON appointments(staff_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status       ON appointments(status);

-- visits
CREATE INDEX idx_visits_client_id  ON visits(client_id);
CREATE INDEX idx_visits_staff_id   ON visits(staff_id);
CREATE INDEX idx_visits_visit_date ON visits(visit_date);

-- visit_services
CREATE INDEX idx_visit_services_visit_id  ON visit_services(visit_id);
CREATE INDEX idx_visit_services_staff_id  ON visit_services(staff_id);

-- follow_ups
CREATE INDEX idx_follow_ups_status        ON follow_ups(status);
CREATE INDEX idx_follow_ups_scheduled_for ON follow_ups(scheduled_for);

-- whatsapp_messages
CREATE INDEX idx_whatsapp_messages_status                 ON whatsapp_messages(status);
CREATE INDEX idx_whatsapp_messages_related_appointment_id ON whatsapp_messages(related_appointment_id);

-- ============================================================
-- TRIGGER — auto-update updated_at
-- ============================================================

-- Reusable function: whenever a row is updated, set updated_at = now()
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to clients
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Apply to appointments
CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
