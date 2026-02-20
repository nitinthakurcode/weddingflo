-- Migration: 0013_module_sync_improvements
-- February 2026 - Module sync improvements for WeddingFlo
-- Features: RSVP→Budget sync, Vendor ratings, Payment reminders

-- Budget: Add per-guest cost tracking for RSVP→Budget sync
ALTER TABLE budget ADD COLUMN IF NOT EXISTS per_guest_cost TEXT;
ALTER TABLE budget ADD COLUMN IF NOT EXISTS is_per_guest_item BOOLEAN DEFAULT false;

-- Vendors: Add review count for rating aggregation
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Vendor Reviews table for rating system
CREATE TABLE IF NOT EXISTS vendor_reviews (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  service_quality INTEGER CHECK (service_quality IS NULL OR (service_quality >= 1 AND service_quality <= 5)),
  communication INTEGER CHECK (communication IS NULL OR (communication >= 1 AND communication <= 5)),
  value_for_money INTEGER CHECK (value_for_money IS NULL OR (value_for_money >= 1 AND value_for_money <= 5)),
  would_recommend BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient review lookups by vendor
CREATE INDEX IF NOT EXISTS vendor_reviews_vendor_id_idx ON vendor_reviews(vendor_id);

-- Index for reviews by client (for client-specific review filtering)
CREATE INDEX IF NOT EXISTS vendor_reviews_client_id_idx ON vendor_reviews(client_id);

-- Comment explaining the module sync features
COMMENT ON COLUMN budget.per_guest_cost IS 'Cost per guest for RSVP→Budget sync (e.g., catering per plate)';
COMMENT ON COLUMN budget.is_per_guest_item IS 'If true, estimatedCost = perGuestCost * confirmedGuestCount';
COMMENT ON COLUMN vendors.review_count IS 'Cached count of reviews for this vendor';
COMMENT ON TABLE vendor_reviews IS 'Reviews and ratings for vendors, aggregated into vendors.rating';
