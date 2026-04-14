# Сущность: Клиенты (Clients)

## Метаданные
- **Категория**: Основная сущность
- **Обновлено**: 2026-04-14
- **Маршруты**: `/clients`, `/clients/new`, `/clients/:id`, `/clients/:id/edit`

## Обзор
Клиенты — центральная сущность CRM. Каждый клиент связан с риелтором и может быть:
- **Покупателем** (`buyer`) — ищет недвижимость
- **Продавцом** (`seller`) — продаёт недвижимость
- **Оба** (`both`) — хочет и продать, и купить

## Структура данных

```js
{
  id: string,                  // Уникальный ID
  realtor_id: string,          // ID риелтора (связь с users)
  full_name: string,           // ФИО
  phone: string,               // Основной телефон
  phone_2: string,             // Дополнительный телефон
  email: string,               // Email
  messenger: string,           // WhatsApp | Telegram | Viber
  client_type: string,         // buyer | seller | both
  source: string,              // Авито | ЦИАН | рекомендация | соцсети | звонок
  status: string,              // active | paused | completed | rejected
  notes: string,               // Заметки
  created_at: ISO8601,
  updated_at: ISO8601
}
```

## UI Компоненты
- `ListPage` — список клиентов с фильтрацией
- `DetailsPage` — карточка клиента (полная информация)
- `FormPage` — форма создания/редактирования

## Связи с другими сущностями

```
Client
├── Properties (объекты, которые продаёт)
├── Requests (запросы на покупку)
├── Matches (совпадения)
├── Showings (показы)
└── Deals (сделки)
```

## Источники клиентов
- **Авито** — объявления на Avito
- **ЦИАН** — объявления на Cian.ru
- **Рекомендация** — от других клиентов
- **Соцсети** — из социальных сетей
- **Звонок** — входящий звонок

## Статусы клиентов
- **active** — активный, ведётся работа
- **paused** — приостановлен (временный перерыв)
- **completed** — завершён (сделка состоялась)
- **rejected** — отказался от сотрудничества

## Действия (Reducer Actions)
- `ADD_CLIENT` — добавить клиента
- `UPDATE_CLIENT` — обновить данные

## Синхронизация с Supabase
Данные клиентов синхронизируются с Supabase через `supabaseSync.js`.

## Примеры (из seed.js)
```js
{
  id: 'c1',
  realtor_id: 'user-1',
  full_name: 'Иванов Пётр Сергеевич',
  phone: '+7-999-123-4567',
  messenger: 'WhatsApp',
  client_type: 'buyer',
  source: 'Авито',
  status: 'active',
  notes: 'Торопится, переезжает из другого города до марта'
}
```

## Связи
- [tech-stack.md](../facts/tech-stack.md) — общий обзор сущностей
- [requests.md](./requests.md) — запросы клиентов
- [showings.md](./showings.md) — показы объектов
