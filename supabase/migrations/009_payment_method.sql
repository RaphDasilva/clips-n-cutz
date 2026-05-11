-- Migration 009 — Add payment_method to visits
-- Captures how the client paid: cash, bank transfer, or POS terminal.

ALTER TABLE visits
  ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'transfer', 'pos'));
