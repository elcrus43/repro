-- 1. Добавляем поля для комиссий и доплаты в таблицу объектов
ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission numeric DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission_buyer numeric DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS surcharge numeric DEFAULT 0;

-- 2. Добавляем поле для связи запроса с родительским объектом (альтернативная сделка)
-- Это позволит нам знать, что данный запрос на покупку является частью продажи другого объекта.
ALTER TABLE requests ADD COLUMN IF NOT EXISTS parent_property_id uuid REFERENCES properties(id) ON DELETE SET NULL;

-- 3. Добавляем индекс для ускорения поиска связанных запросов
CREATE INDEX IF NOT EXISTS idx_requests_parent_property ON requests(parent_property_id);
