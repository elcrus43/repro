-- Migration: Add floor_total column to properties table
-- Fixes: "Could not find the 'floor_total' column of 'properties' in the schema cache"

-- Add floor_total column if not exists
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS floor_total INTEGER DEFAULT 9;

-- Add comment
COMMENT ON COLUMN properties.floor_total IS 'Total floors in building';

-- Update existing records (optional - set default value)
UPDATE properties 
SET floor_total = 9 
WHERE floor_total IS NULL;
