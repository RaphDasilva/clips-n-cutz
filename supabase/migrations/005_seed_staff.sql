-- Seed staff accounts for Clips N'Cutz
-- Initial PIN for all staff: 0000 (they will be asked to change on first login)

INSERT INTO users (name, phone, pin_hash, role, is_active, must_change_pin) VALUES
  ('Akorede',    '09164946179', '$2b$10$Stwi4Y.OQr7xQIqHNJWl/.jUKArcgI3r3pdJTvyw2VvVYgKpxOk.m', 'staff', true, true),
  ('Ifeoma',     '09031923397', '$2b$10$Stwi4Y.OQr7xQIqHNJWl/.jUKArcgI3r3pdJTvyw2VvVYgKpxOk.m', 'staff', true, true),
  ('Boluwaduro', '08169907438', '$2b$10$Stwi4Y.OQr7xQIqHNJWl/.jUKArcgI3r3pdJTvyw2VvVYgKpxOk.m', 'staff', true, true),
  ('Azeez',      '08068233849', '$2b$10$Stwi4Y.OQr7xQIqHNJWl/.jUKArcgI3r3pdJTvyw2VvVYgKpxOk.m', 'staff', true, true),
  ('Taiwo',      '07039064370', '$2b$10$Stwi4Y.OQr7xQIqHNJWl/.jUKArcgI3r3pdJTvyw2VvVYgKpxOk.m', 'staff', true, true);
