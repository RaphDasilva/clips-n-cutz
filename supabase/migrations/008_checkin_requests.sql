-- Staff self-check-in requests, confirmed by manager
-- Time recorded = when manager confirms (server-side), not when staff tapped

CREATE TABLE checkin_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     UUID NOT NULL REFERENCES users(id),
  date         DATE NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  UNIQUE (staff_id, date)
);

CREATE INDEX idx_checkin_requests_date     ON checkin_requests(date);
CREATE INDEX idx_checkin_requests_staff_id ON checkin_requests(staff_id);
