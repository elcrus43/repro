-- Migration 052: Add multiple clients support to selection_items

ALTER TABLE selection_items ADD COLUMN IF NOT EXISTS client_ids text[] DEFAULT '{}';

-- Migrate existing client_id to client_ids
UPDATE selection_items 
SET client_ids = ARRAY[client_id::text] 
WHERE client_id IS NOT NULL 
  AND (client_ids IS NULL OR array_length(client_ids, 1) IS NULL OR array_length(client_ids, 1) = 0);
