-- Migration 053: Create app_errors table for client-side and backend error logging

CREATE TABLE IF NOT EXISTS app_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    realtor_id UUID,
    error_message TEXT,
    error_stack TEXT,
    context_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_errors ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (so we don't block log generation)
DROP POLICY IF EXISTS "App errors insert policy" ON app_errors;
CREATE POLICY "App errors insert policy" ON app_errors FOR INSERT
    WITH CHECK (true);

-- Allow anyone to read (for developer inspection)
DROP POLICY IF EXISTS "App errors select policy" ON app_errors;
CREATE POLICY "App errors select policy" ON app_errors FOR SELECT
    USING (true);
