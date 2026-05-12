-- Migration 041: Add mortgage details to deals table
-- Adds bank name, approved amount, and expiry date for mortgage deals.

ALTER TABLE deals ADD COLUMN IF NOT EXISTS mortgage_bank   TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS mortgage_amount NUMERIC;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS mortgage_expiry DATE;
