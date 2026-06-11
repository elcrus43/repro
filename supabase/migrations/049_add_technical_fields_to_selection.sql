-- Migration 049: Add technical characteristics columns to selection_items table

ALTER TABLE selection_items 
ADD COLUMN IF NOT EXISTS rooms INTEGER,
ADD COLUMN IF NOT EXISTS area_total NUMERIC,
ADD COLUMN IF NOT EXISTS floor INTEGER,
ADD COLUMN IF NOT EXISTS floors_total INTEGER,
ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'apartment',
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[];
