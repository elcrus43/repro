-- 1. Добавляем новые колонки
ALTER TABLE clients ADD COLUMN client_types text[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN additional_contacts jsonb DEFAULT '[]';

-- 2. Мигрируем данные из старого client_type в новый массив client_types
UPDATE clients SET client_types = 
  CASE 
    WHEN client_type = 'buyer' THEN ARRAY['buyer']
    WHEN client_type = 'seller' THEN ARRAY['seller']
    WHEN client_type = 'both' THEN ARRAY['buyer', 'seller']
    ELSE ARRAY['buyer']
  END;

-- 3. (Опционально) Если в phone_2 были данные, можно попробовать перенести их в первый элемент additional_contacts
-- Но обычно там пусто, поэтому просто удаляем колонки.
ALTER TABLE clients DROP COLUMN client_type;
ALTER TABLE clients DROP COLUMN phone_2;
