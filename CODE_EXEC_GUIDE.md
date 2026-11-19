# CODE_EXEC_GUIDE.md — Руководство Code Mode для REA CRM

> Это руководство для AI-агента (Claude Code, Gemini, Copilot и др.).
> Вместо того чтобы гнать сотни записей через LLM-контекст, агент пишет скрипт,
> который локально фильтрует/агрегирует данные и возвращает только результат.

---

## 1. Схема БД (ключевые таблицы)

| Таблица | Назначение | Ключевые поля |
|---|---|---|
| `profiles` | Риелторы | `id`, `email`, `full_name`, `role`, `status` |
| `clients` | Клиенты | `id`, `realtor_id`, `full_name`, `phone`, `client_types`, `status` |
| `properties` | Объекты недвижимости | `id`, `realtor_id`, `address`, `price`, `rooms`, `area_total`, `district`, `deal_type`, `status` |
| `requests` | Запросы клиентов на подбор | `id`, `realtor_id`, `client_id`, `budget_min/max`, `rooms[]`, `districts[]`, `status` |
| `matches` | Совпадения request↔property | `id`, `property_id`, `request_id`, `score`, `match_level`, `status` |
| `showings` | Показы объектов | `id`, `match_id`, `property_id`, `client_id`, `showing_date`, `status`, `client_feedback` |
| `tasks` | Задачи риелтора | `id`, `realtor_id`, `title`, `task_type`, `due_date`, `status` |
| `deals` | Сделки | `id`, `property_id`, `client_id`, `deal_type`, `status` |

### Связи

```
profiles ──< clients
profiles ──< properties
profiles ──< requests
clients  ──< requests   (client_id)
properties >── matches ──< requests
matches  ──< showings
```

### Типы сделок (`deal_type`)
- `sale` — продажа
- `rent` — аренда

### Статусы объектов (`properties.status`)
- `active` — в работе
- `sold` — продан/сдан
- `archived` — архив

### Уровни матча (`matches.match_level`)
- `high` — score ≥ 80%
- `medium` — score 50–79%
- `low` — score < 50%

---

## 2. Переменные окружения (`.env`)

```env
# Neon (рекомендуется для прямых SQL-запросов)
NEON_DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require

# Supabase (альтернатива, только через REST API)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

> [!IMPORTANT]
> `SUPABASE_SERVICE_ROLE_KEY` — серверный ключ, **никогда** не передавать во frontend.
> `VITE_SUPABASE_ANON_KEY` ограничен RLS — подходит только для диагностики без auth.

---

## 3. Как запускать скрипты

### Готовые скрипты

```bash
# Найти клиентов без матчей и показать топ-5 совпадений
node code_exec/skills/find_matches.mjs

# Статистика воронки в виде markdown-таблиц
node code_exec/skills/diagnose_pipeline.mjs
```

### Произвольный SQL через run_script

```bash
# Передать файл
node code_exec/run_script.mjs code_exec/skills/find_matches.mjs

# Передать код через stdin (--stdin)
node code_exec/run_script.mjs --stdin << 'EOF'
import { runQuery } from './code_exec/db_query.mjs';
const rows = await runQuery('SELECT status, COUNT(*) FROM clients GROUP BY status');
console.log(JSON.stringify(rows, null, 2));
EOF
```

> `run_script.mjs` возвращает JSON `{ stdout, stderr, returncode, timed_out }`.

---

## 4. Примеры скриптов

### Матчинг клиент↔объект

```js
import { runQuery } from './code_exec/db_query.mjs';
import { matchClientsToProperties } from './code_exec/match_engine.mjs';

const requests = await runQuery(`
  SELECT * FROM requests WHERE status = 'active' AND budget_max > 0 LIMIT 20
`);
const properties = await runQuery(`
  SELECT id, address, price, rooms, area_total, district, deal_type, status
  FROM properties WHERE status = 'active' LIMIT 100
`);

const matches = matchClientsToProperties(requests, properties, { minScore: 50 }, 10);
console.log(JSON.stringify(matches, null, 2));
```

### Статистика воронки

```js
import { getPipelineStats } from './code_exec/db_query.mjs';
const stats = await getPipelineStats();
console.log('Клиентов:', stats._summary.clients_total);
console.log('Матчей:', stats._summary.matches_total);
console.log(JSON.stringify(stats, null, 2));
```

### Диагностика показов за период

```js
import { runQuery } from './code_exec/db_query.mjs';

const rows = await runQuery(`
  SELECT
    s.showing_date::date AS date,
    s.status,
    s.client_feedback,
    p.address,
    p.price
  FROM showings s
  JOIN properties p ON p.id = s.property_id
  WHERE s.showing_date >= NOW() - INTERVAL '30 days'
  ORDER BY s.showing_date DESC
`);

// Группировка по обратной связи
const byFeedback = {};
for (const r of rows) {
  byFeedback[r.client_feedback ?? 'unknown'] = (byFeedback[r.client_feedback ?? 'unknown'] ?? 0) + 1;
}
console.log('Показы за 30 дней:', rows.length);
console.log('По обратной связи:', JSON.stringify(byFeedback, null, 2));
```

### Компактная схема БД для агента

```js
import { getSchema } from './code_exec/db_query.mjs';
const schema = getSchema();
console.log(schema); // вставить в контекст
```

### Запросы с фильтрацией через filterProperties

```js
import { runQuery } from './code_exec/db_query.mjs';
import { filterProperties } from './code_exec/match_engine.mjs';

const all = await runQuery('SELECT * FROM properties WHERE status = \'active\'');
const filtered = filterProperties(all, {
  deal_type: 'sale',
  rooms: [2, 3],
  priceMin: 3_000_000,
  priceMax: 7_000_000,
  district: 'Советский',
});
console.log(`Объектов по фильтру: ${filtered.length}`);
filtered.forEach(p => console.log(p.address, p.price, p.rooms));
```

---

## 5. Системная инструкция для агента

**Когда использовать Code Mode.** REA CRM содержит тысячи клиентов, объектов и показов. Перед тем как делать выводы или отвечать на вопросы о данных, агент обязан запустить скрипт через `code_exec/` и работать с его выводом, а не строить предположения по памяти. Правило: если вопрос касается статистики, совпадений, диагностики или подбора — сначала скрипт.

**Как писать скрипт.** Скрипт должен быть автономным `.mjs` модулем с `async` точкой входа и вызовом `main().catch(console.error)`. Импортируй `runQuery` из `./code_exec/db_query.mjs` для SQL-запросов и `matchClientsToProperties` из `./code_exec/match_engine.mjs` для матчинга. Никогда не используй `runQuery` для UPDATE/DELETE — только SELECT. Выводи результат через `console.log(JSON.stringify(..., null, 2))` для структурированных данных или в виде markdown-таблиц для текстового вывода.

**Что выводить в контекст.** Скрипт должен возвращать только агрегированный результат: счётчики, топ-N записей, итоговую таблицу. Никогда не выводи полные строки таблиц с персональными данными (телефон, email, паспорт) — только id и поля, нужные для задачи. Если нужен размер данных, используй `getPipelineStats()`. Для схемы БД — `getSchema()`.

**Безопасность и ошибки.** Переменная `NEON_DATABASE_URL` читается из `.env` в корне проекта. Если скрипт падает с `Нет подключения к БД` — проверь наличие `.env` и корректность `NEON_DATABASE_URL`. При ошибке Neon скрипт выводит `stderr` — включи его в ответ пользователю. Не пытайся угадывать данные, если запрос не прошёл.

---

## 6. Файловая структура code_exec/

```
code_exec/
├── README.md                    ← документация папки
├── match_engine.mjs             ← локальный матчинг (без DB)
├── db_query.mjs                 ← запросы к Neon/Supabase
├── run_script.mjs               ← точка входа Code Mode
└── skills/
    ├── find_matches.mjs         ← рецепт: поиск совпадений
    └── diagnose_pipeline.mjs    ← рецепт: диагностика воронки
```
