-- Per-staff weekly off-days stored as an array of day numbers
-- 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
ALTER TABLE users ADD COLUMN off_days INTEGER[] NOT NULL DEFAULT '{}';

-- Ifeoma and Taiwo: Mondays off
UPDATE users SET off_days = ARRAY[1] WHERE name IN ('Ifeoma', 'Taiwo') AND role = 'staff';

-- Azeez and Akorede: Tuesdays off
UPDATE users SET off_days = ARRAY[2] WHERE name IN ('Azeez', 'Akorede') AND role = 'staff';

-- Boluwaduro: Thursdays off
UPDATE users SET off_days = ARRAY[4] WHERE name = 'Boluwaduro' AND role = 'staff';
