-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FINAL DATABASE FIX — Realtor-Match                        ║
-- ║  Вставьте этот SQL в Supabase → SQL Editor → Run          ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1. Добавляем поле Комиссия (Commission)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission numeric DEFAULT 0;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS commission numeric DEFAULT 0;

-- 2. Добавляем поля для Микрорайонов (Microdistrict)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS microdistrict text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS microdistricts text[];

-- 3. Обновляем существующие записи (если нужно)
UPDATE properties SET commission = 0 WHERE commission IS NULL;
UPDATE requests SET commission = 0 WHERE commission IS NULL;

-- 4. Пересчитываем кэш схемы (обычно происходит автоматически, но на всякий случай)
NOTIFY pgrst, 'reload schema';
