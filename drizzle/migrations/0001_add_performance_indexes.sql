-- Performance indexes for WeddingFlo
-- Run this migration to add indexes for faster query performance

-- Guests table indexes
CREATE INDEX IF NOT EXISTS guests_client_id_idx ON guests(client_id);
CREATE INDEX IF NOT EXISTS guests_rsvp_status_idx ON guests(rsvp_status);

-- Hotels table indexes
CREATE INDEX IF NOT EXISTS hotels_client_id_idx ON hotels(client_id);
CREATE INDEX IF NOT EXISTS hotels_guest_id_idx ON hotels(guest_id);

-- Guest Transport table indexes
CREATE INDEX IF NOT EXISTS guest_transport_client_id_idx ON guest_transport(client_id);
CREATE INDEX IF NOT EXISTS guest_transport_guest_id_idx ON guest_transport(guest_id);

-- Clients table indexes
CREATE INDEX IF NOT EXISTS clients_company_id_idx ON clients(company_id);

-- Session table indexes (if using BetterAuth sessions table)
CREATE INDEX IF NOT EXISTS session_user_id_idx ON session(user_id);
CREATE INDEX IF NOT EXISTS session_expires_at_idx ON session(expires_at);

-- Events table index
CREATE INDEX IF NOT EXISTS events_client_id_idx ON events(client_id);

-- Timeline table index
CREATE INDEX IF NOT EXISTS timeline_client_id_idx ON timeline(client_id);

-- Budget table index
CREATE INDEX IF NOT EXISTS budget_client_id_idx ON budget(client_id);
