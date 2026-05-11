-- Links each staff member to the services they offer
CREATE TABLE staff_services (
  staff_id   uuid REFERENCES users(id)    ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

CREATE INDEX idx_staff_services_staff_id   ON staff_services(staff_id);
CREATE INDEX idx_staff_services_service_id ON staff_services(service_id);
