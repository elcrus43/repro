# Supabase Migrations

Вместо хаотичных SQL-патчей в корне проекта используйте систему миграций Supabase CLI.

## Установка Supabase CLI

```bash
npm install -g supabase
```

## Инициализация (один раз)

```bash
supabase init
supabase login
supabase link --project-ref YOUR_PROJECT_ID
```

## Создание новой миграции

```bash
# Вместо создания файла ADD_PASSPORT_COLUMN.sql в корне — делайте так:
supabase migration new add_passport_column
# Создастся файл: supabase/migrations/20240101120000_add_passport_column.sql
```

## Применение миграций

```bash
# На локальной БД:
supabase db reset

# На продакшн БД:
supabase db push
```

## Конвертация существующих SQL-патчей

Перенесите все файлы из корня проекта:

| Старый файл              | Новая миграция                                           |
|--------------------------|----------------------------------------------------------|
| `ADD_PASSPORT_COLUMN.sql` | `supabase/migrations/001_add_passport_column.sql`       |
| `FIX_ADMIN_ROLE.sql`      | `supabase/migrations/002_fix_admin_role.sql`            |
| `FINAL_DATABASE_FIX.sql`  | `supabase/migrations/003_final_database_fix.sql`        |

После переноса — удалите SQL-файлы из корня и добавьте их в `.gitignore`.

## Пример миграции (add_passport_column)

```sql
-- supabase/migrations/001_add_passport_column.sql

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS passport_details TEXT;

-- Обновляем политику RLS если нужно
-- CREATE POLICY ...
```
