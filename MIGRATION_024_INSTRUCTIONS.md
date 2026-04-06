# 🗄️ Инструкция по выполнению миграции 024

## ⚠️ ВАЖНО: Выполните вручную в Supabase Dashboard

REST API Supabase не поддерживает выполнение DDL-запросов (ALTER TABLE, CREATE INDEX и т.д.).
Миграцию нужно выполнить через SQL Editor в Supabase Dashboard.

---

## 📋 Шаги:

### 1. Откройте Supabase Dashboard
Перейдите по ссылке:
```
https://supabase.com/dashboard/project/hxivaohzugahjyuaahxc
```

### 2. Откройте SQL Editor
В левом меню нажмите: **SQL Editor**

### 3. Скопируйте и выполните миграцию
Откройте файл:
```
supabase/migrations/024_schema_consistency_fix.sql
```

Скопируйте **всё содержимое** файла и вставьте в SQL Editor.

Нажмите **Run** (или Ctrl+Enter).

---

## ✅ Что сделает миграция:

1. **Добавит недостающие колонки** в таблицу `properties`:
   - `notes TEXT`
   - `deal_type TEXT DEFAULT 'sale'`
   - `price_min NUMERIC`
   - `microdistrict TEXT`
   - `build_year INTEGER`

2. **Исправит конфликт имён** `floors_total` / `floor_total`

3. **Синхронизирует данные** между `build_year` и `year_built`

4. **Добавит колонки** в таблицу `clients`:
   - `client_types TEXT[]`
   - `additional_contacts JSONB`
   - `passport_details JSONB`

5. **Создаст триггеры** `updated_at` для всех таблиц

6. **Добавит 11 индексов** для производительности

7. **Настроит RLS политики** для всех таблиц

---

## 🔍 Проверка после выполнения:

После выполнения миграции, в SQL Editor выполните:

```sql
-- Проверка колонок properties
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'properties' 
ORDER BY ordinal_position;

-- Проверка индексов
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'properties';

-- Проверка триггеров
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers;
```

---

## 📝 Примечания:

- Миграция **идемпотентна** — безопасна для повторного запуска
- Все `ALTER TABLE ADD COLUMN IF NOT EXISTS` — не вызовет ошибок если колонка уже есть
- Все `CREATE INDEX IF NOT EXISTS` — не вызовет ошибок если индекс уже есть
- Все `DROP POLICY IF EXISTS` + `CREATE POLICY` — безопасно пересоздаёт политики

---

**После выполнения миграции сообщите мне, и я продолжу работу над следующими задачами.**
