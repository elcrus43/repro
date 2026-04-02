ALTER TABLE requests ADD COLUMN IF NOT EXISTS payment_types text[] DEFAULT '{mortgage}';

UPDATE requests SET payment_types = ARRAY[payment_type] WHERE payment_type IS NOT NULL AND payment_types IS NULL;

ALTER TABLE requests DROP COLUMN IF EXISTS payment_type;
