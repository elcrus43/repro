# ISSUE-002 — Данные не сохраняются (клиенты, показы)

## Метаданные
- **Дата**: 2026-04-14
- **Статус**: ✅ Решена
- **Критичность**: 🔴 Высокая (блокирует основной функционал)
- **Компонент**: `src/context/supabaseSync.js`, `src/context/useDbDispatch.js`

## Описание проблемы
Пользователь сообщил: **"не сохраняются клиенты, показы, пропали некоторые записи"**

## Причина

### 1. Клиенты — `phones` массив vs `phone` колонка
Форма отправляет:
```js
{
  phones: ['+79991234567', '+79997654321'],  // массив
  ...
}
```

Но в БД таблица `clients` имеет:
```sql
phone TEXT,  -- одиночная колонка
-- phones массива НЕТ!
```

`supabaseSync.js` пытался вставить массив `phones` → **ошибка схемы** → данные НЕ сохранялись.

### 2. Показы — отсутствует `realtor_id`
При создании показа `realtor_id` мог быть undefined:
```js
const showing = {
  property_id: '...',
  client_id: '...',
  // realtor_id: ОТСУТСТВУЕТ
};
```

RLS политика Supabase отклоняла вставку: `realtor_id = auth.uid()` не выполнялось.

## Решение

### Исправление 1: `supabaseSync.js`
```js
// ADD_CLIENT и UPDATE_CLIENT теперь преобразуют:
const clientData = {
  phone: action.client.phone || (action.client.phones?.[0]) || '',
  phone_2: action.client.phones?.[1] || action.client.phone_2 || '',
  // ... остальное
};
delete clientData.phones; // Удаляем массив перед вставкой
```

### Исправление 2: `useDbDispatch.js`
```js
// ADD_SHOWING
const sh = {
  ...action.showing,
  realtor_id: action.showing.realtor_id || stateRef.current.currentUser?.id,
};

// UPDATE_SHOWING
enhancedAction.showing = {
  ...action.showing,
  realtor_id: action.showing.realtor_id || stateRef.current.currentUser?.id,
};
```

### Исправление 3: Миграция БД
Создана миграция `030_fix_clients_and_showings_save_issues.sql`:
- Добавляет `phone_2` в `clients`
- Гарантирует наличие `realtor_id` в `showings`
- Устанавливает правильные DEFAULT для JSONB полей

## Файлы
- `src/context/supabaseSync.js` — исправлена нормализация клиентов
- `src/context/useDbDispatch.js` — добавлен `realtor_id` для показов
- `supabase/migrations/030_fix_clients_and_showings_save_issues.sql` — миграция БД

## Как применить исправление

1. **Закоммитить код** ✅
2. **Выполнить миграцию в Supabase Dashboard**:
   ```
   Открыть https://supabase.com/dashboard → SQL Editor
   Вставить содержимое 030_fix_clients_and_showings_save_issues.sql
   Нажать "Run"
   ```
3. **Обновить приложение** — данные начнут сохраняться

## Тестирование
После миграции проверить:
- [ ] Создать нового клиента → должен сохраниться
- [ ] Редактировать клиента → изменения должны сохраниться
- [ ] Создать показ → должен сохраниться
- [ ] Проверить в Supabase Dashboard → данные должны появиться

## Связи
- [ADR-001](../decisions/ADR-001-fix-data-persistence.md) — архитектурное решение
- [ISSUE-001](./ISSUE-001-cities-import.md) — предыдущая проблема импорта
