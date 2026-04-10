-- 029_add_deal_deposit_fields.sql
-- Добавление полей задатка в таблицу сделок

-- Добавляем колонки для задатка
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deposit_date TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0;

-- Добавляем колонку notes для заметок по сделке
ALTER TABLE deals ADD COLUMN IF NOT EXISTS notes TEXT;

-- Индекс для фильтрации по дате
CREATE INDEX IF NOT EXISTS idx_deals_deal_date ON deals(deal_date);
CREATE INDEX IF NOT EXISTS idx_deals_deposit_date ON deals(deposit_date);
