-- 037_add_deal_multi_clients.sql
-- Добавление поддержки нескольких продавцов и покупателей в сделки

ALTER TABLE deals ADD COLUMN IF NOT EXISTS seller_ids UUID[] DEFAULT '{}';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS buyer_ids UUID[] DEFAULT '{}';

-- Миграция данных из старых полей (если они заполнены)
UPDATE deals SET seller_ids = ARRAY[seller_id] WHERE seller_id IS NOT NULL AND (seller_ids IS NULL OR cardinality(seller_ids) = 0);
UPDATE deals SET buyer_ids = ARRAY[buyer_id] WHERE buyer_id IS NOT NULL AND (buyer_ids IS NULL OR cardinality(buyer_ids) = 0);
