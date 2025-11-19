-- =====================================================
-- FLOOR PLAN SYSTEM
-- Interactive seating chart with drag-and-drop
-- Adapted for WeddingFlow Pro Architecture
-- =====================================================

CREATE TABLE IF NOT EXISTS floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Plan Information
  name TEXT NOT NULL DEFAULT 'Floor Plan',
  venue_name TEXT,
  event_date DATE,

  -- Canvas Configuration
  canvas_width INTEGER NOT NULL DEFAULT 1200,
  canvas_height INTEGER NOT NULL DEFAULT 800,
  background_image_url TEXT,
  show_grid BOOLEAN NOT NULL DEFAULT FALSE,
  grid_size INTEGER NOT NULL DEFAULT 50,

  -- Saved Viewport State
  zoom_level NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  pan_x INTEGER NOT NULL DEFAULT 0,
  pan_y INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT zoom_range CHECK (zoom_level >= 0.1 AND zoom_level <= 5.0)
);

CREATE TABLE IF NOT EXISTS floor_plan_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,

  -- Table Information
  table_number TEXT NOT NULL,
  table_name TEXT, -- Optional custom name
  table_shape TEXT NOT NULL CHECK (table_shape IN ('round', 'rectangle', 'square')),

  -- Position and Size
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL DEFAULT 100,
  height INTEGER NOT NULL DEFAULT 100,
  rotation NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Capacity
  capacity INTEGER NOT NULL DEFAULT 8,
  min_capacity INTEGER NOT NULL DEFAULT 4,
  max_capacity INTEGER NOT NULL DEFAULT 12,

  -- Styling
  fill_color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  stroke_color VARCHAR(7) NOT NULL DEFAULT '#1E40AF',
  stroke_width INTEGER NOT NULL DEFAULT 2,

  -- Metadata
  notes TEXT,
  is_vip BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT rotation_range CHECK (rotation >= -180 AND rotation <= 180),
  CONSTRAINT capacity_range CHECK (capacity >= min_capacity AND capacity <= max_capacity)
);

CREATE TABLE IF NOT EXISTS floor_plan_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES floor_plan_tables(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,

  -- Seat Information
  seat_number INTEGER,
  seat_position JSONB, -- {x: 0, y: 0} relative to table center

  -- Timestamps
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Uniqueness: One guest per floor plan
  CONSTRAINT unique_guest_per_floor_plan UNIQUE (floor_plan_id, guest_id)
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plan_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plan_guests ENABLE ROW LEVEL SECURITY;

-- Floor Plans
CREATE POLICY "companies_manage_floor_plans"
  ON floor_plans
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

-- Floor Plan Tables
CREATE POLICY "companies_manage_floor_plan_tables"
  ON floor_plan_tables
  FOR ALL
  USING (
    floor_plan_id IN (
      SELECT id FROM floor_plans
      WHERE company_id = current_setting('app.current_company_id')::uuid
    )
  );

-- Floor Plan Guests
CREATE POLICY "companies_manage_floor_plan_guests"
  ON floor_plan_guests
  FOR ALL
  USING (
    floor_plan_id IN (
      SELECT id FROM floor_plans
      WHERE company_id = current_setting('app.current_company_id')::uuid
    )
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_floor_plans_client_id ON floor_plans(client_id);
CREATE INDEX idx_floor_plans_company_id ON floor_plans(company_id);

CREATE INDEX idx_floor_plan_tables_floor_plan_id ON floor_plan_tables(floor_plan_id);

CREATE INDEX idx_floor_plan_guests_floor_plan_id ON floor_plan_guests(floor_plan_id);
CREATE INDEX idx_floor_plan_guests_table_id ON floor_plan_guests(table_id);
CREATE INDEX idx_floor_plan_guests_guest_id ON floor_plan_guests(guest_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION update_floor_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER floor_plans_updated_at_trigger
  BEFORE UPDATE ON floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_floor_plans_updated_at();

CREATE TRIGGER floor_plan_tables_updated_at_trigger
  BEFORE UPDATE ON floor_plan_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_floor_plans_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get assigned guest count for a table
CREATE OR REPLACE FUNCTION get_table_guest_count(p_table_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM floor_plan_guests
  WHERE table_id = p_table_id;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Get unassigned guests for a floor plan
CREATE OR REPLACE FUNCTION get_unassigned_guests(p_floor_plan_id UUID)
RETURNS TABLE (
  guest_id UUID,
  first_name TEXT,
  last_name TEXT,
  dietary_restrictions TEXT,
  has_plus_one BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.first_name,
    g.last_name,
    g.dietary_restrictions,
    g.has_plus_one
  FROM guests g
  INNER JOIN floor_plans fp ON g.client_id = fp.client_id
  WHERE fp.id = p_floor_plan_id
    AND g.id NOT IN (
      SELECT guest_id
      FROM floor_plan_guests
      WHERE floor_plan_id = p_floor_plan_id
    );
END;
$$;

-- Check table capacity before assignment
CREATE OR REPLACE FUNCTION check_table_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get table capacity
  SELECT capacity INTO v_capacity
  FROM floor_plan_tables
  WHERE id = NEW.table_id;

  -- Get current guest count
  SELECT COUNT(*) INTO v_current_count
  FROM floor_plan_guests
  WHERE table_id = NEW.table_id;

  -- Check if adding this guest would exceed capacity
  IF v_current_count >= v_capacity THEN
    RAISE EXCEPTION 'Table capacity exceeded. Current: %, Capacity: %', v_current_count, v_capacity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_table_capacity_trigger
  BEFORE INSERT ON floor_plan_guests
  FOR EACH ROW
  EXECUTE FUNCTION check_table_capacity();
