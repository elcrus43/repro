-- ═══════════════════════════════════════════════════════════════
-- Миграция: Добавление колонок в таблицу properties
-- Запустить в Neon Console → SQL Editor: https://console.neon.tech/
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS latitude      NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude     NUMERIC,
  ADD COLUMN IF NOT EXISTS contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;
