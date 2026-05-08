-- Migration 035: add event_type to showings and updated_at
ALTER TABLE showings ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'showing';
ALTER TABLE showings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
