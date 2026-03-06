-- Migration: Add commission field to properties and requests
-- This allows tracking the commission amount for each deal/object

-- 1. Add commission column to properties
alter table properties add column if not exists commission numeric default 0;

-- 2. Add commission column to requests
alter table requests add column if not exists commission numeric default 0;

-- Note: commission is stored as a numeric value representing the amount in rubles.
