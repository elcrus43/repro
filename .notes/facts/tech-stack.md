# 🏗 Факты о проекте Re-Pro

## Основная информация
- **Название**: Re-Pro (realtor-match)
- **Тип**: CRM для риелторов
- **Версия**: 0.0.0
- **Приватный**: да

## Ключевые сущности

### 👥 Клиенты (Clients)
**Маршруты**: `/clients`, `/clients/new`, `/clients/:id`, `/clients/:id/edit`

**Поля клиента**:
- `id`, `realtor_id` — связь с риелтором
- `full_name` — ФИО
- `phone`, `phone_2` — телефоны
- `email`, `messenger` — связь (WhatsApp/Telegram/Viber)
- `client_type` — тип: `buyer` (покупатель), `seller` (продавец), `both` (и то и другое)
- `source` — источник: Авито, ЦИАН, рекомендация, соцсети, звонок
- `status` — статус: `active`, `paused`, `completed`, `rejected`
- `notes` — заметки

**Связи**:
- ↔ Properties (объекты клиента)
- ↔ Requests (запросы клиента)
- ↔ Matches (совпадения)
- ↔ Showings (показы)

### 🏠 Объекты (Properties)
**Маршруты**: `/properties`, `/properties/new`, `/properties/:id`, `/properties/:id/edit`

**Поля**:
- `client_id` — владелец
- `realtor_id` — риелтор
- `status` — статус (встреча, АД, реклама, задаток, сделка, отказ, активен, продан, резерв, снят)
- `property_type` — тип: квартира, дом, участок, коммерческая, комната
- `market_type` — рынок: вторичка, новостройка
- `address`, `city`, `district`, `microdistrict`
- `price`, `price_min` — цена и минимум
- Комнаты, площадь, этаж, этажность
- `photos` — массив изображений (Cloudinary)

### 🎯 Запросы (Requests)
**Маршруты**: `/requests`, `/requests/new`, `/requests/:id`

Запросы клиентов на покупку/аренду недвижимости.

**Поля**:
- `client_id` — кто запросил
- `budget_min`, `budget_max`
- `rooms_min`, `rooms_max`
- `area_min`, `area_max`
- `city`, `districts` — желаемые локации
- `property_type` — тип недвижимости
- `floor_min`, `floor_max`
- `notes` — дополнительные пожелания

### 🔗 Совпадения (Matches)
**Маршруты**: `/matches`, `/matches/:id`

Автоматическое сопоставление объектов и запросов.

**Поля**:
- `property_id`, `request_id`
- `score` — процент совпадения
- `status` — `new`, `showing_planned`, `showing_done`, `rejected`

### 📅 Показы (Showings)
**Маршруты**: `/showings`, `/showings/new`, `/showings/:id`

Планирование и проведение показов объектов.

**Поля**:
- `match_id` — связь с совпадением
- `client_id`, `property_id`
- `showing_date` — дата и время
- `status` — `planned`, `completed`, `cancelled`, `no_show`
- `notes`, `feedback` — заметки и обратная связь

### 🤝 Сделки (Deals)
**Маршруты**: `/deals`, `/deals/new`, `/deals/:id`

**Поля**:
- `client_id`, `property_id`
- `deal_type` — тип сделки
- `price` — цена сделки
- `status` — статус
- `date` — дата

### ✅ Задачи (Tasks)
**Маршруты**: `/tasks`

**Типы задач**:
- Обычные задачи
- Встречи (Meetings)
- Задачи с владельцами (MeetingOwner)

**Поля**:
- `type`, `title`, `description`
- `due_date` — срок
- `status` — состояние
- `assigned_to` — кому назначена

### 📊 Дашборд (Dashboard)
**Маршрут**: `/` (главная)

Обзор ключевых метрик и активности.

### 📝 Шаблоны документов (Templates)
**Маршрут**: `/templates`

Шаблоны для генерации документов (договоры, акты и т.д.).

### 💰 Оценки (Estimations)
**Маршрут**: `/estimations`

Оценка стоимости недвижимости.

### 👤 Профиль (Profile)
**Маршрут**: `/profile`

Настройки пользователя, смена пароля.

### 💬 Сообщения (Messaging)
**Маршрут**: `/messages`

Внутренняя система сообщений.

## Действия (Actions в useDbDispatch)

```
ADD_CLIENT, UPDATE_CLIENT
ADD_PROPERTY, UPDATE_PROPERTY
ADD_REQUEST, UPDATE_REQUEST
UPDATE_MATCH
ADD_SHOWING, UPDATE_SHOWING
ADD_TASK, UPDATE_TASK, DELETE_TASK
ADD_DEAL, UPDATE_DEAL, DELETE_DEAL
ADD_PRICE_ITEM, UPDATE_PRICE_ITEM
UPDATE_PROFILE
```

## Интеграции
- **Supabase**: аутентификация, БД PostgreSQL
- **Cloudinary**: загрузка изображений объектов
- **Vercel**: хостинг

## Локация
- **Город**: Киров (основной)
- **Районы**: Ленинский, Октябрьский, Первомайский, Нововятский
- **Микрорайоны**: Юго-Западный, Чистые Пруды, Филейка, Лепсе, и др.
- **Доп. города**: Москва, Санкт-Петербург, Другой

## Типы недвижимости
- Квартира, Дом, Участок, Коммерческая, Комната

## Типы строительства
- Панель, Кирпич, Монолит, Дерево, Блок

## Типы ремонта
- Без ремонта, Косметический, Евро, Дизайнерский

## Балконы
- Нет, Балкон, Лоджия, Оба
