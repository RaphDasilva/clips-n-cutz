-- Add tip tracking to visits
-- Tips go 100% to the staff member who served the client

ALTER TABLE visits ADD COLUMN tip_ngn INTEGER NOT NULL DEFAULT 0;
