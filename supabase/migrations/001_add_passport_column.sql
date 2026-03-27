-- Add missing passport_details column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS passport_details JSONB DEFAULT '{}'::jsonb;

-- Ensure the schema cache is refreshed (Supabase does this automatically mostly, 
-- but you can run this to be sure if using PostgREST directly)
NOTIFY pgrst, 'reload schema';
