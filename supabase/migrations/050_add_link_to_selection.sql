-- Migration 050: Add listing link/url to selection_items table
ALTER TABLE selection_items 
ADD COLUMN IF NOT EXISTS link TEXT;
