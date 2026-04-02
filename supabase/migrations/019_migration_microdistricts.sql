-- Migration for microdistrict support

-- 1. Add microdistrict to properties (text)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS microdistrict text;

-- 2. Add microdistricts to requests (text array)
ALTER TABLE requests ADD COLUMN IF NOT EXISTS microdistricts text[];
