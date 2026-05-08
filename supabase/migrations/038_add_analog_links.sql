-- Migration 038: Add manual analog links to properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS portfolio_analog_links JSONB DEFAULT '[]'::jsonb;
