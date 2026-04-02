-- 1. Расширяем прейскурант категориями видимости
ALTER TABLE pricelist ADD COLUMN IF NOT EXISTS show_in_sale boolean DEFAULT true;
ALTER TABLE pricelist ADD COLUMN IF NOT EXISTS show_in_purchase boolean DEFAULT true;

-- 2. Добавляем расходы и комиссию в таблицу запросов
ALTER TABLE requests ADD COLUMN IF NOT EXISTS deal_expenses jsonb DEFAULT '[]';
ALTER TABLE requests ADD COLUMN IF NOT EXISTS commission numeric DEFAULT 0;

-- 3. Обновляем существующие записи в прейскуранте (примерное разделение)
UPDATE pricelist SET show_in_sale = true, show_in_purchase = false WHERE name IN ('Сделка', 'Выделение долей');
UPDATE pricelist SET show_in_sale = true, show_in_purchase = true WHERE name IN ('Нотариальные', 'Страхование', 'СЭР+СБР');
