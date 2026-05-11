-- Attendance and penalty tracking for staff

-- Sunday church grace: staff with this flag get until 1pm on Sundays instead of 12pm
ALTER TABLE users ADD COLUMN sunday_grace BOOLEAN NOT NULL DEFAULT false;

-- One attendance record per staff per day
CREATE TABLE attendance (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id       UUID NOT NULL REFERENCES users(id),
  date           DATE NOT NULL,
  checked_in_at  TIME,   -- NULL means absent
  status         TEXT NOT NULL CHECK (status IN ('on_time', 'late', 'absent')),
  penalty_ngn    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id, date)
);

CREATE INDEX idx_attendance_staff_id ON attendance(staff_id);
CREATE INDEX idx_attendance_date     ON attendance(date);
