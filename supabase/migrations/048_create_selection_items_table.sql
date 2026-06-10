-- Migration 048: Create selection_items table for candidates of properties selection

CREATE TABLE IF NOT EXISTS selection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    realtor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    contact_name TEXT,
    contact_phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE selection_items ENABLE ROW LEVEL SECURITY;

-- Select policy: own items or admins
DROP POLICY IF EXISTS "Selection items select policy" ON selection_items;
CREATE POLICY "Selection items select policy" ON selection_items FOR SELECT
    USING (auth.uid() = realtor_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Insert policy: only own items
DROP POLICY IF EXISTS "Selection items insert policy" ON selection_items;
CREATE POLICY "Selection items insert policy" ON selection_items FOR INSERT
    WITH CHECK (auth.uid() = realtor_id);

-- Update policy: own items or admins
DROP POLICY IF EXISTS "Selection items update policy" ON selection_items;
CREATE POLICY "Selection items update policy" ON selection_items FOR UPDATE
    USING (auth.uid() = realtor_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Delete policy: own items or admins
DROP POLICY IF EXISTS "Selection items delete policy" ON selection_items;
CREATE POLICY "Selection items delete policy" ON selection_items FOR DELETE
    USING (auth.uid() = realtor_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_selection_items_realtor_id ON selection_items(realtor_id);
CREATE INDEX IF NOT EXISTS idx_selection_items_client_id ON selection_items(client_id);
