-- Migration: Fix properties table schema
-- Adds all missing columns used in the application

-- Create properties table if not exists with all required columns
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT REFERENCES clients(id),
    realtor_id TEXT,
    status TEXT DEFAULT 'active',
    property_type TEXT,
    deal_type TEXT DEFAULT 'sale',
    market_type TEXT,
    city TEXT,
    district TEXT,
    microdistrict TEXT,
    residential_complex TEXT,
    address TEXT,
    price INTEGER DEFAULT 0,
    price_min INTEGER,
    area_total NUMERIC DEFAULT 0,
    area_living NUMERIC,
    area_kitchen NUMERIC,
    rooms INTEGER DEFAULT 1,
    floor INTEGER DEFAULT 1,
    floors_total INTEGER DEFAULT 9,
    building_type TEXT,
    year_built INTEGER,
    build_year INTEGER,
    renovation TEXT,
    bathroom TEXT,
    balcony TEXT,
    parking TEXT,
    furniture BOOLEAN DEFAULT false,
    mortgage_available BOOLEAN DEFAULT false,
    matcapital_available BOOLEAN DEFAULT false,
    ownership_type TEXT,
    encumbrance BOOLEAN DEFAULT false,
    minor_owners BOOLEAN DEFAULT false,
    sale_type TEXT,
    docs_ready BOOLEAN DEFAULT false,
    urgency TEXT,
    description TEXT,
    notes TEXT,
    title TEXT,
    commission INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE properties IS 'Объекты недвижимости (продажи)';
COMMENT ON COLUMN properties.deal_type IS 'Тип сделки: sale (продажа), rent (аренда)';
COMMENT ON COLUMN property_type IS 'Тип недвижимости: apartment, house, land, commercial, room';
COMMENT ON COLUMN properties.floors_total IS 'Всего этажей в здании';
COMMENT ON COLUMN properties.year_built IS 'Год постройки (альяс build_year)';
COMMENT ON COLUMN properties.microdistrict IS 'Микрорайон';
COMMENT ON COLUMN properties.area_living IS 'Жилая площадь м²';
COMMENT ON COLUMN properties.area_kitchen IS 'Площадь кухни м²';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_realtor ON properties(realtor_id);
CREATE INDEX IF NOT EXISTS idx_properties_client ON properties(client_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_created ON properties(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Policies (adjust based on your auth setup)
DROP POLICY IF EXISTS "Users can view properties" ON properties;
CREATE POLICY "Users can view properties" ON properties
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert properties" ON properties;
CREATE POLICY "Users can insert properties" ON properties
    FOR INSERT
    WITH CHECK (auth.uid()::text = realtor_id);

DROP POLICY IF EXISTS "Users can update properties" ON properties;
CREATE POLICY "Users can update properties" ON properties
    FOR UPDATE
    USING (auth.uid()::text = realtor_id);

DROP POLICY IF EXISTS "Users can delete properties" ON properties;
CREATE POLICY "Users can delete properties" ON properties
    FOR DELETE
    USING (auth.uid()::text = realtor_id);
