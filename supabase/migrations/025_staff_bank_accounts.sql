-- Staff bank details for weekly payouts.
-- Staff edit these from their own dashboard; the owner sees the
-- live values on the payouts page so they know exactly where to
-- send each week's money.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name   TEXT;
