-- Add google_event_id column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_event_id TEXT;
