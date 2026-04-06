-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Realtor-Match — Schema Consistency Fix (Migration 024)                ║
-- ║  Fixes all inconsistencies found in the schema audit                   ║
-- ║  Idempotent: safe to run multiple times                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO properties TABLE
-- ============================================================================

-- notes TEXT — property notes/comments
ALTER TABLE properties ADD COLUMN IF NOT EXISTS notes TEXT;

-- deal_type TEXT DEFAULT 'sale' — type of deal: sale, rent
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deal_type TEXT DEFAULT 'sale';

-- price_min NUMERIC — minimum price range
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_min NUMERIC;

-- microdistrict TEXT — microdistrict/neighborhood
ALTER TABLE properties ADD COLUMN IF NOT EXISTS microdistrict TEXT;

-- build_year INTEGER — year built (alias for year_built)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS build_year INTEGER;

-- ============================================================================
-- 2. FIX floor_total / floors_total INCONSISTENCY
-- ============================================================================

-- Ensure floors_total exists (app uses this name consistently)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floors_total INTEGER DEFAULT 9;

-- Add floor_total as a generated alias column pointing to floors_total
-- Using a view-like approach: floor_total is a separate column that we sync
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor_total INTEGER;

-- Sync data: floors_total -> floor_total (for backward compatibility)
UPDATE properties
SET floor_total = floors_total
WHERE floor_total IS NULL AND floors_total IS NOT NULL;

-- Sync data: floor_total -> floors_total (if floor_total was set directly)
UPDATE properties
SET floors_total = floor_total
WHERE floors_total IS NULL AND floor_total IS NOT NULL;

-- Set defaults where still null
UPDATE properties
SET floors_total = 9
WHERE floors_total IS NULL;

UPDATE properties
SET floor_total = 9
WHERE floor_total IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN properties.floors_total IS 'Total floors in building (primary column)';
COMMENT ON COLUMN properties.floor_total IS 'Alias for floors_total (backward compatibility)';

-- ============================================================================
-- 3. SYNC build_year FROM year_built WHERE APPLICABLE
-- ============================================================================

-- Copy year_built -> build_year where build_year is null but year_built has data
UPDATE properties
SET build_year = year_built
WHERE build_year IS NULL AND year_built IS NOT NULL;

-- Copy build_year -> year_built where year_built is null but build_year has data
UPDATE properties
SET year_built = build_year
WHERE year_built IS NULL AND build_year IS NOT NULL;

-- ============================================================================
-- 4. ENSURE clients TABLE HAS REQUIRED COLUMNS
-- ============================================================================

-- client_types TEXT[] DEFAULT '{buyer}'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_types TEXT[] DEFAULT '{buyer}';

-- additional_contacts JSONB DEFAULT '[]'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS additional_contacts JSONB DEFAULT '[]';

-- passport_details JSONB
ALTER TABLE clients ADD COLUMN IF NOT EXISTS passport_details JSONB;

-- ============================================================================
-- 5. ADD updated_at TRIGGERS FOR ALL TABLES WITH updated_at COLUMN
-- ============================================================================

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- clients.updated_at trigger
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- requests.updated_at trigger
DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- matches.updated_at trigger
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- showings.updated_at trigger (add updated_at column first if missing)
ALTER TABLE showings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_showings_updated_at ON showings;
CREATE TRIGGER update_showings_updated_at
    BEFORE UPDATE ON showings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- tasks.updated_at trigger (add updated_at column first if missing)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- properties.updated_at trigger (ensure it exists)
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ADD PERFORMANCE INDEXES
-- ============================================================================

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_realtor ON properties(realtor_id);
CREATE INDEX IF NOT EXISTS idx_properties_client ON properties(client_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_district ON properties(district);

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_realtor ON clients(realtor_id);

-- Requests indexes
CREATE INDEX IF NOT EXISTS idx_requests_realtor ON requests(realtor_id);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_property ON matches(property_id);
CREATE INDEX IF NOT EXISTS idx_matches_request ON matches(request_id);

-- Showings indexes
CREATE INDEX IF NOT EXISTS idx_showings_realtor ON showings(realtor_id);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_realtor ON tasks(realtor_id);

-- ============================================================================
-- 7. ENSURE RLS IS ENABLED WITH CORRECT POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE showings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- --- Profiles ---
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_modify_own" ON profiles;
CREATE POLICY "profiles_modify_own" ON profiles
    FOR ALL
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- --- Clients (PRIVATE — owner only) ---
DROP POLICY IF EXISTS "clients_select_own" ON clients;
CREATE POLICY "clients_select_own" ON clients
    FOR SELECT
    USING (realtor_id = auth.uid());

DROP POLICY IF EXISTS "clients_modify_own" ON clients;
CREATE POLICY "clients_modify_own" ON clients
    FOR ALL
    USING (realtor_id = auth.uid())
    WITH CHECK (realtor_id = auth.uid());

-- --- Properties (Public SELECT, owner modify) ---
DROP POLICY IF EXISTS "properties_select_all" ON properties;
CREATE POLICY "properties_select_all" ON properties
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "properties_modify_own" ON properties;
CREATE POLICY "properties_modify_own" ON properties
    FOR ALL
    USING (realtor_id = auth.uid())
    WITH CHECK (realtor_id = auth.uid());

-- --- Requests (Public SELECT, owner modify) ---
DROP POLICY IF EXISTS "requests_select_all" ON requests;
CREATE POLICY "requests_select_all" ON requests
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "requests_modify_own" ON requests;
CREATE POLICY "requests_modify_own" ON requests
    FOR ALL
    USING (realtor_id = auth.uid())
    WITH CHECK (realtor_id = auth.uid());

-- --- Matches (Public SELECT, owner modify) ---
DROP POLICY IF EXISTS "matches_select_all" ON matches;
CREATE POLICY "matches_select_all" ON matches
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "matches_modify_own" ON matches;
CREATE POLICY "matches_modify_own" ON matches
    FOR ALL
    USING (realtor_id = auth.uid())
    WITH CHECK (realtor_id = auth.uid());

-- --- Showings (Public SELECT, owner modify) ---
DROP POLICY IF EXISTS "showings_select_all" ON showings;
CREATE POLICY "showings_select_all" ON showings
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "showings_modify_own" ON showings;
CREATE POLICY "showings_modify_own" ON showings
    FOR ALL
    USING (realtor_id = auth.uid())
    WITH CHECK (realtor_id = auth.uid());

-- --- Tasks (STRICTLY PRIVATE) ---
DROP POLICY IF EXISTS "tasks_all_own" ON tasks;
CREATE POLICY "tasks_all_own" ON tasks
    FOR ALL
    USING (realtor_id = auth.uid())
    WITH CHECK (realtor_id = auth.uid());

-- ============================================================================
-- 8. NOTIFY PostgREST TO RELOAD SCHEMA
-- ============================================================================

NOTIFY pgrst, 'reload schema';
