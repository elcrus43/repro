-- 1. Удаляем дубликаты в таблице matches
-- Если есть несколько записей с одинаковыми property_id и request_id,
-- оставляем ту, у которой статус более "продвинутый" или она была создана позже.

DELETE FROM matches a
USING matches b
WHERE a.id < b.id -- оставляем запись с бОльшим id (обычно более новая)
  AND a.property_id = b.property_id
  AND a.request_id = b.request_id;

-- 2. Добавляем уникальный индекс, чтобы предотвратить появление дубликатов в будущем
-- Это заставит команду upsert обновлять существующие записи вместо создания новых.
ALTER TABLE matches ADD CONSTRAINT matches_prop_req_unique UNIQUE (property_id, request_id);

-- 3. Исправляем realtor_id в существующих совпадениях
-- realtor_id в matches должен принадлежать владельцу запроса (покупателя), 
-- чтобы он мог видеть совпадение согласно политикам RLS.
UPDATE matches m
SET realtor_id = r.realtor_id
FROM requests r
WHERE m.request_id = r.id;
