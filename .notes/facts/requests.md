# Сущность: Запросы клиентов (Requests)

## Метаданные
- **Категория**: Основная сущность
- **Обновлено**: 2026-04-14
- **Маршруты**: `/requests`, `/requests/new`, `/requests/:id`

## Обзор
Запросы — это критерии поиска недвижимости для клиентов-покупателей. На основе запросов система автоматически находит совпадения с доступными объектами.

## Структура данных

```js
{
  id: string,                  // Уникальный ID
  client_id: string,          // Связь с клиентом
  realtor_id: string,         // ID риелтора
  budget_min: number,         // Минимальный бюджет
  budget_max: number,         // Максимальный бюджет
  rooms_min: number,          // Минимум комнат
  rooms_max: number,          // Максимум комнат
  area_min: number,           // Минимальная площадь (м²)
  area_max: number,           // Максимальная площадь (м²)
  city: string,               // Желаемый город
  districts: array,           // Желаемые районы
  property_type: string,      // Тип недвижимости
  floor_min: number,          // Минимальный этаж
  floor_max: number,          // Максимальный этаж
  building_type: string,      // Тип здания (панель/кирпич/монолит)
  renovation: string,         // Тип ремонта
  market_type: string,        // Рынок (вторичка/новостройка)
  notes: string,              // Дополнительные пожелания
  is_active: boolean,         // Активен ли запрос
  created_at: ISO8601,
  updated_at: ISO8601
}
```

## UI Компоненты
- `ListPage` — список запросов
- `FormPage` — форма создания/редактирования

## Связи с другими сущностями

```
Request
├── Client (владелец запроса)
├── Matches (совпадения с объектами)
└── Properties (через matches)
```

## Механизм совпадений (Matching)

Система автоматически создаёт **Matches** сравнивая:
1. Тип недвижимости
2. Локация (город, районы)
3. Бюджет vs цена объекта
4. Комнаты, площадь, этаж
5. Тип здания, ремонта

Результат: `score` (процент совпадения)

## Действия (Reducer Actions)
- `ADD_REQUEST` — создать запрос
- `UPDATE_REQUEST` — обновить запрос

## Примеры
```js
{
  id: 'r1',
  client_id: 'c1',
  realtor_id: 'user-1',
  budget_min: 3000000,
  budget_max: 5000000,
  rooms_min: 2,
  rooms_max: 3,
  area_min: 50,
  area_max: 80,
  city: 'Киров',
  districts: ['Ленинский район'],
  property_type: 'apartment',
  notes: 'Желательно靠近 центр'
}
```

## Связи
- [tech-stack.md](../facts/tech-stack.md) — общий обзор
- [clients.md](./clients.md) — клиенты
- [matches.md](./matches.md) — совпадения
