-- Agent Profile Updates
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inn TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS passport_details JSONB DEFAULT '{}'::jsonb;

-- Property Updates
ALTER TABLE properties ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission_buyer NUMERIC;
