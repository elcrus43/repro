-- 1. Try a standard notify to reload schema cache
NOTIFY pgrst, 'reload schema';

-- 2. If the above doesn't work, this dummy change FORCES a reload
ALTER TABLE clients ADD COLUMN IF NOT EXISTS schema_refresh_dummy BOOLEAN;
ALTER TABLE clients DROP COLUMN IF EXISTS schema_refresh_dummy;

-- 3. Just to be absolutely sure everything is in sync
NOTIFY pgrst, 'reload schema';
