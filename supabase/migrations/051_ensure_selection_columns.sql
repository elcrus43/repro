-- Migration 051: Ensure all required columns exist in selection_items
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE selection_items 
ADD COLUMN IF NOT EXISTS rooms INTEGER,
ADD COLUMN IF NOT EXISTS area_total NUMERIC,
ADD COLUMN IF NOT EXISTS floor INTEGER,
ADD COLUMN IF NOT EXISTS floors_total INTEGER,
ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'apartment',
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[],
ADD COLUMN IF NOT EXISTS link TEXT;
