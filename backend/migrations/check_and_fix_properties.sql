-- Проверка текущей схемы таблицы properties
-- Выполните этот скрипт в Supabase SQL Editor, чтобы увидеть существующие колонки

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'properties'
ORDER BY ordinal_position;

-- Если каких-то колонок нет, выполните миграцию:
-- backend/migrations/fix_properties_schema.sql

-- Быстрое добавление отсутствующих колонок (альтернатива полной миграции):
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deal_type TEXT DEFAULT 'sale';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'apartment';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS microdistrict TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS area_living NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS area_kitchen NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floors_total INTEGER DEFAULT 9;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS build_year INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS year_built INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS market_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS residential_complex TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_min INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS renovation TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bathroom TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS balcony TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS furniture BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mortgage_available BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS matcapital_available BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ownership_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS encumbrance BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS minor_owners BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sale_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS docs_ready BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS urgency TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS notes TEXT;
