-- 030_fix_clients_and_showings_save_issues.sql
-- Исправление проблем с сохранением клиентов и показов

-- 1. Добавить phone_2 в clients (для второго телефона)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_2 TEXT;

-- 2. Убедиться, что client_types имеет правильный default
ALTER TABLE clients ALTER COLUMN client_types SET DEFAULT '{buyer}';

-- 3. Убедиться, что additional_contacts имеет правильный default  
ALTER TABLE clients ALTER COLUMN additional_contacts SET DEFAULT '[]'::jsonb;

-- 4. Убедиться, что passport_details может быть NULL
ALTER TABLE clients ALTER COLUMN passport_details DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN passport_details SET DEFAULT NULL;

-- 5. Добавить realtor_id в showings если отсутствует
ALTER TABLE showings ADD COLUMN IF NOT EXISTS realtor_id UUID REFERENCES profiles(id);

-- 6. Индекс для быстрого поиска по realtor_id
CREATE INDEX IF NOT EXISTS idx_clients_realtor ON clients(realtor_id);
CREATE INDEX IF NOT EXISTS idx_showings_realtor ON showings(realtor_id);

-- 7. Обновить RLS для phone_2 (автоматически работает через clients_modify_own)
-- Политика уже покрывает все колонки таблицы
