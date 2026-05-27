-- Migration 046: Update property status to pipeline stages
-- Replaces old status values (active, paused, etc.) with pipeline stages

-- 1. Drop existing check constraint if any
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;

-- 2. Update existing old statuses to closest pipeline equivalent
UPDATE properties SET status = 'meeting'     WHERE status IN ('active');
UPDATE properties SET status = 'advertising' WHERE status IN ('reserved');
UPDATE properties SET status = 'deal'        WHERE status IN ('sold', 'deal_closed', 'withdrawn', 'refused');

-- 3. Add new check constraint with pipeline stages
ALTER TABLE properties
  ADD CONSTRAINT properties_status_check
  CHECK (status IN ('meeting', 'agreement', 'advertising', 'deposit', 'deal'));
