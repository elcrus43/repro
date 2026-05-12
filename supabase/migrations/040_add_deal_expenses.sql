-- Migration 040: Add expenses column to deals table
-- This column will store a list of expenses associated with a deal in JSONB format.

ALTER TABLE deals ADD COLUMN IF NOT EXISTS expenses JSONB DEFAULT '[]'::jsonb;
