═══════════════════════════════════════════════════════════════
  ⚠️ СРОЧНО: МИГРАЦИЯ 030 НЕ ПРИМЕНЕНА!
═══════════════════════════════════════════════════════════════

Без этой миграции НЕ РАБОТАЕТ сохранение клиентов и показов.

ИНСТРУКЦИЯ:
1. Откройте: https://supabase.com/dashboard/project/hxivaohzugahjyuaahxc/sql
2. Скопируйте весь SQL ниже
3. Нажмите RUN

═══════════════════════════════════════════════════════════════
SQL ДЛЯ КОПИРОВАНИЯ:
═══════════════════════════════════════════════════════════════

-- 030_fix_clients_and_showings_save_issues.sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_2 TEXT;
ALTER TABLE clients ALTER COLUMN client_types SET DEFAULT '{buyer}';
ALTER TABLE clients ALTER COLUMN additional_contacts SET DEFAULT '[]'::jsonb;
ALTER TABLE clients ALTER COLUMN passport_details DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN passport_details SET DEFAULT NULL;
ALTER TABLE showings ADD COLUMN IF NOT EXISTS realtor_id UUID REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_clients_realtor ON clients(realtor_id);
CREATE INDEX IF NOT EXISTS idx_showings_realtor ON showings(realtor_id);

═══════════════════════════════════════════════════════════════
