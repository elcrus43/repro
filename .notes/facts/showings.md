# Сущность: Показы (Showings)

## Метаданные
- **Категория**: Основная сущность
- **Обновлено**: 2026-04-14
- **Маршруты**: `/showings`, `/showings/new`, `/showings/:id`

## Обзор
Показы — это запланированные встречи для демонстрации объектов недвижимости клиентам. Каждый показ связан с совпадением (match) между запросом клиента и объектом.

## Структура данных

```js
{
  id: string,                  // Уникальный ID
  match_id: string,           // Связь с совпадением
  client_id: string,          // ID клиента
  property_id: string,        // ID объекта
  showing_date: ISO8601,      // Дата и время показа
  status: string,             // planned | completed | cancelled | no_show
  notes: string,              // Заметки перед показом
  feedback: string,           // Обратная связь после показа
  created_at: ISO8601
}
```

## UI Компоненты
- `ListPage` — список всех показов
- `FormPage` — форма создания/редактирования показа
- `DetailsPage` — детальная информация о показе

## Статусы показов
- **planned** — запланирован
- **completed** — проведён
- **cancelled** — отменён
- **no_show** — клиент не явился

## Влияние на совпадения (Matches)
При создании/обновлении показа автоматически обновляется статус связанного совпадения:

```
ADD_SHOWING → match.status = 'showing_planned'
UPDATE_SHOWING (status='completed') → match.status = 'showing_done'
```

## Связи с другими сущностями

```
Showing
├── Match (совпадение)
├── Client (клиент)
├── Property (объект)
└── Task (задача на показ)
```

## Действия (Reducer Actions)
- `ADD_SHOWING` — добавить показ
  - Создаёт задачу на показ
  - Обновляет статус match на `showing_planned`
- `UPDATE_SHOWING` — обновить показ
  - При статусе `completed` обновляет match на `showing_done`

## Рабочий процесс

1. **Создание совпадения** → система находит match между запросом и объектом
2. **Планирование показа** → риелтор создаёт showing из match
3. **Проведение показа** → встреча с клиентом
4. **Обратная связь** → риелтор вносит feedback
5. **Обновление статуса** → match обновляется, создаются следующие шаги

## Примеры (из seed.js)
```js
{
  id: 'sh1',
  match_id: 'm1',
  client_id: 'c1',
  property_id: 'p1',
  showing_date: '2026-04-14T14:00:00Z',
  status: 'planned',
  notes: 'Показать в 14:00, клиент торопится',
  feedback: ''
}
```

## Генерация задач
При создании показа автоматически создаётся задача типа `_buildShowingTask(sh, now)`.

## Связи
- [tech-stack.md](../facts/tech-stack.md) — общий обзор сущностей
- [clients.md](./clients.md) — клиенты
- [matches.md](./matches.md) — совпадения
