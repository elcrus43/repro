-- Migration 042: Add notes column to requests table
-- Adds a free-text notes field to purchase requests (запросы на покупку)

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN requests.notes IS 'Дополнительные пожелания и заметки по запросу';
