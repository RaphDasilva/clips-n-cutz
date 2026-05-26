-- ============================================================
-- 020_expenses.sql
-- Clips N'Cutz Salon CRM — Owner expense tracking
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- The system tracks revenue but not what the salon spends on
-- products, electricity, rent, etc. Without expenses, "profit"
-- in the dashboards is really just gross revenue.
--
-- This table holds simple cash-out entries. Owner-only.
-- Categories are free text so the salon can adapt the menu over
-- time; an enum would lock us into early guesses.
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  category    TEXT NOT NULL,                  -- e.g. 'Products', 'Electricity', 'Rent'
  amount_ngn  INTEGER NOT NULL,
  vendor      TEXT,                           -- shop name, supplier
  notes       TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
