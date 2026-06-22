# 🚀 Руководство по миграции Supabase → Neon

## Обзор

Neon — это serverless PostgreSQL, полностью совместимый с PostgreSQL 16+.
В отличие от Supabase, Neon не включает встроенную аутентификацию — она реализована через Vercel API functions (`api/neon-auth.js` и `api/neon-query.js`).

---

## Шаг 1: Создать проект на Neon

1. Перейдите на [neon.tech](https://neon.tech/) и зарегистрируйтесь (бесплатно)
2. Нажмите **New Project** → введите имя (например `realtor-match`)
3. Выберите регион **Frankfurt (eu-central-1)** — ближайший к СНГ
4. Нажмите **Create Project**

---

## Шаг 2: Получить DATABASE_URL

1. В панели Neon перейдите в **Dashboard → Connection Details**
2. Скопируйте **Connection string** (pooled). Формат:
   ```
   postgresql://user:password@ep-xxx-xxx-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Сохраните строку — она понадобится на Шаге 4

---

## Шаг 3: Запустить схему в Neon SQL Editor

1. В панели Neon откройте **SQL Editor**
2. Откройте файл [`neon-schema.sql`](./neon-schema.sql) в редакторе кода
3. Скопируйте всё содержимое и вставьте в Neon SQL Editor
4. Нажмите **Run**
5. Убедитесь что все таблицы созданы: `profiles`, `user_sessions`, `clients`, `properties`, `requests`, `matches`, `showings`, `tasks`, `pricelist`, `deals`, `selection_items`, `app_errors`

> [!IMPORTANT]
> Схема использует `gen_random_uuid()` — это встроенная функция PostgreSQL 13+. Расширение `uuid-ossp` не нужно.

---

## Шаг 4: Добавить переменные окружения в Vercel

В [Vercel Dashboard](https://vercel.com/) → ваш проект → **Settings → Environment Variables**:

| Переменная          | Значение                        | Описание                     |
|---------------------|---------------------------------|------------------------------|
| `NEON_DATABASE_URL` | `postgresql://user:pass@...`    | Connection string из Шага 2  |
| `NEON_JWT_SECRET`   | (случайная строка 64+ символов) | Секрет для подписи JWT       |

Для генерации `NEON_JWT_SECRET` можно использовать:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Шаг 5: Установить зависимости

```bash
npm install @neondatabase/serverless jsonwebtoken bcryptjs
```

Это добавит в `package.json`:
- `@neondatabase/serverless` — HTTP-драйвер для Neon (работает в Edge/Vercel Functions)
- `jsonwebtoken` — создание и верификация JWT
- `bcryptjs` — хэширование паролей

---

## Шаг 6: Переключить backend на Neon

В файле `.env` (или `.env.local`) измените:
```env
# Было:
VITE_BACKEND=supabase
# или
VITE_BACKEND=firebase

# Стало:
VITE_BACKEND=neon
```

Затем перезапустите dev-сервер:
```bash
npm run dev
```

---

## Шаг 7: Создать первого администратора

После деплоя используйте Neon SQL Editor для создания первого пользователя-администратора:

```sql
-- Вставить администратора (замените email и хэш пароля)
-- Хэш bcrypt для пароля 'admin123' (rounds=10):
INSERT INTO profiles (email, password_hash, full_name, role, status)
VALUES (
  'admin@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Администратор',
  'admin',
  'approved'
);
```

> [!CAUTION]
> Обязательно замените хэш пароля! Для генерации хэша:
> ```js
> const bcrypt = require('bcryptjs');
> console.log(await bcrypt.hash('ваш_пароль', 10));
> ```

---

## Шаг 8: Экспорт данных из Supabase → Neon

### 8а) Экспорт из Supabase

В Supabase Dashboard → **Project Settings → Database → Backups** или используйте `pg_dump`:

```bash
pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  --data-only \
  --table=profiles \
  --table=clients \
  --table=properties \
  --table=requests \
  --table=matches \
  --table=showings \
  --table=tasks \
  --table=pricelist \
  --table=deals \
  --table=selection_items \
  -f supabase_export.sql
```

### 8б) Обработка данных

Перед импортом необходимо добавить колонки `email` и `password_hash` в профили.
Используйте следующий скрипт-адаптер:

```js
// scripts/migrate-to-neon.mjs
import { readFileSync, writeFileSync } from 'fs';

// Читаем экспортированные данные
const sql = readFileSync('supabase_export.sql', 'utf-8');

// Добавляем email из auth.users (нужно получить отдельно из Supabase)
// В Supabase Dashboard → Authentication → Users → Export
const neonSql = sql
  // Убираем ссылки на auth.users (profiles.id был FK)
  .replace(/ALTER TABLE profiles ADD CONSTRAINT.*\n/g, '');

writeFileSync('neon_import.sql', neonSql);
console.log('Done: neon_import.sql');
```

### 8в) Импорт в Neon

```bash
psql "postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require" \
  -f neon_import.sql
```

---

## Архитектура после миграции

```
Клиент (React)
    │
    ├── src/lib/neonAuth.js     ← Auth сервис (JWT, localStorage)
    │       ↓
    │   POST /api/neon-auth     ← Vercel Function: login/register/refresh
    │       ↓
    │   Neon DB: profiles, user_sessions
    │
    └── src/context/neonSync.js ← Data sync (loadUserData, syncAction)
            │
        src/lib/neon.js         ← neonDb клиент
            ↓
        POST /api/neon-query    ← Vercel Function: SQL proxy + JWT проверка
            ↓
        Neon DB: все таблицы
```

---

## Файлы созданные для миграции

| Файл                          | Описание                                  |
|-------------------------------|-------------------------------------------|
| `neon-schema.sql`             | SQL схема для Neon (без RLS, без auth)   |
| `api/neon-auth.js`            | Vercel Function: аутентификация           |
| `api/neon-query.js`           | Vercel Function: SQL прокси              |
| `src/lib/neon.js`             | Клиент для работы с Neon через API       |
| `src/lib/neonAuth.js`         | Auth сервис совместимый с authService    |
| `src/context/neonSync.js`     | Аналог supabaseSync.js для Neon          |
| `NEON_MIGRATION_GUIDE.md`     | Это руководство                           |

---

## Переменные окружения

Полный список переменных для `.env`:

```env
# Backend (supabase | firebase | neon | localstorage)
VITE_BACKEND=neon

# Neon Database
NEON_DATABASE_URL=postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require

# JWT Secret (минимум 64 символа)
NEON_JWT_SECRET=your-super-secret-key-min-64-chars-long-random-string-here

# Firebase (если нужен параллельный режим)
# FIREBASE_API_KEY=...

# Supabase (если нужен параллельный режим)
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

---

## Часто задаваемые вопросы

**Q: Можно ли запустить Supabase и Neon одновременно?**
A: Да. Переключайте `VITE_BACKEND` между `supabase` и `neon`. Данные не синхронизируются автоматически.

**Q: Как работает авторизация без Supabase Auth?**
A: Пользователи хранятся в таблице `profiles` с полем `password_hash` (bcrypt). JWT токены создаются в `api/neon-auth.js` и хранятся в `localStorage`. Безопасность обеспечивается проверкой JWT в `api/neon-query.js`.

**Q: Есть ли поддержка Google OAuth?**
A: В базовой версии — нет. Можно добавить через Neon + отдельный OAuth провайдер (Auth0, Clerk, и т.д.).

**Q: Как сбросить базу данных Neon?**
A: В Neon Dashboard → **Branches → main → Reset to empty**. Затем повторно запустите `neon-schema.sql`.

**Q: Как обновить пароль пользователя через SQL?**
```sql
-- Сгенерируйте хэш через bcrypt (rounds=10) и обновите:
UPDATE profiles SET password_hash = '$2a$10$...' WHERE email = 'user@example.com';
```
