-- Migration 039: Add mortgage column to properties, requests, and deals tables
-- This column is required for consistency across forms and to track mortgage-related deals.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS mortgage BOOLEAN DEFAULT false;
ALTER TABLE requests   ADD COLUMN IF NOT EXISTS mortgage BOOLEAN DEFAULT false;
ALTER TABLE deals      ADD COLUMN IF NOT EXISTS mortgage BOOLEAN DEFAULT false;

-- For properties, we might want to sync with mortgage_available if it exists,
-- but for now just adding the column as requested.
UPDATE properties SET mortgage = mortgage_available WHERE mortgage_available IS NOT NULL;
