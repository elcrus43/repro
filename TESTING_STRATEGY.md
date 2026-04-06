# Комплексная стратегия тестирования — RealtorMatch CRM

## 1. Текущий статус тестирования

### 1.1. Что есть сейчас
| Аспект | Статус |
|--------|--------|
| Тест-файлы (`.test.*` / `.spec.*`) | **Отсутствуют** — 0 файлов |
| Тест-фреймворк в `package.json` | **Не установлен** |
| CI/CD pipeline для тестов | **Отсутствует** |
| Backend-тесты (Python) | Есть `test_crm.db` и `verify_estimation.py`, но нет pytest-тестов |
| E2E-тесты | **Отсутствуют** |

### 1.2. Выявленные пробелы
- **Критический**: нет тестов для matching-алгоритма (`src/utils/matching.js`) — это ядро продукта
- **Критический**: нет тестов для reducer (`src/context/reducer.js`) — управление всем состоянием приложения
- **Критический**: нет тестов для Supabase sync (`src/context/supabaseSync.js`) — потеря данных при ошибках
- **Высокий**: нет тестов для estimation engine (`src/utils/estimation.js`) — финансовые расчёты
- **Высокий**: нет тестов для форм создания/редактирования клиентов и объектов
- **Средний**: нет тестов для hooks (`usePagination`, `useToast`, `useMatchNotifications`)
- **Средний**: нет тестов для утилит форматирования и генерации DOCX
- **Низкий**: нет E2E-тестов критических пользовательских сценариев

---

## 2. Рекомендуемая настройка тестирования

### 2.1. Стек инструментов

| Уровень | Инструмент | Обоснование |
|---------|-----------|-------------|
| **Unit** | **Vitest** | Уже используется Vite — Vitest нативно интегрирован, zero-config, быстрый |
| **Component** | **Vitest + React Testing Library + jsdom** | Стандарт индустрии, хорошая экосистема |
| **Integration** | **Vitest + MSW (Mock Service Worker)** | Мокирование Supabase API без реального бэкенда |
| **E2E** | **Playwright** | Быстрее Cypress, лучшая поддержка multiple browsers, встроенный trace viewer |
| **Backend** | **pytest + pytest-asyncio** | Стандарт для Python/FastAPI |
| **Покрытие** | **Vitest --coverage (v8)** | Встроен в Vitest, быстрый v8-движок |
| **Моки** | **MSW** для HTTP, **vi.mock** для модулей | |

### 2.2. Установка зависимостей

```bash
# Frontend тестирование
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8 msw @vitest/browser playwright

# Backend тестирование (в backend/)
cd backend
pip install pytest pytest-asyncio httpx pytest-cov

# Инициализация Playwright
npx playwright install
```

### 2.3. Конфигурация Vitest

Создать `vitest.config.js` (или добавить в `vite.config.js`):

```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.config.js',
        'src/lib/supabase.js', // внешний SDK
      ],
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 70,
        statements: 70,
      },
    },
    include: [
      'src/**/*.{test,spec}.{js,jsx}',
      'backend/app/**/*.{test,spec}.py',
    ],
  },
})
```

### 2.4. Setup-файл `src/__tests__/setup.js`

```js
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Автоочистка после каждого теста
afterEach(() => cleanup())

// Мок Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn(),
    },
  },
}))

// Мок window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})
```

### 2.5. Скрипты в `package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

---

## 3. Критические тест-кейсы

### 3.1. Unit-тесты (Приоритет: ВЫСОКИЙ)

#### 3.1.1. Matching-алгоритм (`src/utils/matching.js`)

| # | Тест | Описание |
|---|------|----------|
| M1 | **Mandatory: property_type mismatch** | `calculateMatch` возвращает `null` если `property_type` не в `request.property_types` |
| M2 | **Mandatory: city mismatch** | `calculateMatch` возвращает `null` если города не совпадают |
| M3 | **Mandatory: rooms mismatch** | `calculateMatch` возвращает `null` если `rooms` не в `request.rooms` |
| M4 | **Perfect match (100 pts)** | Все параметры совпадают — score = 100, `match_level = 'perfect'` |
| M5 | **Price: within budget** | Цена в диапазоне — +25 очков |
| M6 | **Price: negotiable** | `price_min <= budget_max` при `price > budget_max` — +15 очков |
| M7 | **Price: slightly over budget** | Цена на 10% выше — +5 очков |
| M8 | **Price: way over budget** | Цена > 110% бюджета — 0 очков |
| M9 | **District: match** | Район совпадает — +20 очков |
| M10 | **District: microdistrict bonus** | Район + микрорайон совпали — +25 очков |
| M11 | **Floor: not first/last** | `not_first_floor` + этаж > 1 — +2.5 очка |
| M12 | **Floor: first floor penalty** | `not_first_floor` + этаж = 1 — -2.5 очка |
| M13 | **Renovation: rank comparison** | `designer >= euro` — +5 очков |
| M14 | **Payment: mortgage available** | `mortgage_available = true` + `payment_types: ['mortgage']` — +10 очков |
| M15 | **Payment: cash always works** | `payment_types: ['cash']` — +10 очков независимо от свойств объекта |
| M16 | **Score < 50 returns null** | Минимальный порог отсечения |
| M17 | **Score 65-84 = good** | Уровень "Хорошее" |
| M18 | **Score 85+ = perfect** | Уровень "Отличное" |
| M19 | **runMatchingForProperty filters inactive requests** | Пропускает запросы со `status !== 'active'` |
| M20 | **runMatchingForRequest filters inactive properties** | Пропускает объекты со `status !== 'active' && !== 'advertising'` |

#### 3.1.2. Reducer (`src/context/reducer.js`)

| # | Тест | Описание |
|---|------|----------|
| R1 | **ADD_CLIENT** | Новый клиент добавляется в массив `clients` |
| R2 | **UPDATE_CLIENT** | Клиент обновляется по `id`, остальные не меняются |
| R3 | **DELETE_CLIENT** | Клиент удаляется по `id` |
| R4 | **ADD_PROPERTY with matches** | Объект + матчи добавляются одновременно |
| R5 | **UPDATE_PROPERTY clears new matches** | Старые матчи со статусом 'new' удаляются |
| R6 | **CLOSE_DEAL** | Property → 'sold', Request → 'found', match → 'deal', related matches → 'rejected', client → 'deal_closed' |
| R7 | **ADD_REQUEST with matches** | Запрос + матчи добавляются |
| R8 | **APPROVE_USER** | Профиль → 'approved', удаляется из `pendingUsers` |
| R9 | **REJECT_USER** | Профиль → 'rejected', обновляется в `pendingUsers` |
| R10 | **LOGOUT resets state** | Возврат к `EMPTY_STATE` с `loading: false` |
| R11 | **Unknown action returns same state** | Неизвестный тип действия не меняет состояние |
| R12 | **ADD_SHOWING creates task** | Показ создаёт задачу |

#### 3.1.3. Estimation Engine (`src/utils/estimation.js`)

| # | Тест | Описание |
|---|------|----------|
| E1 | **Base price for Киров 1-room** | Корректная базовая цена за м² |
| E2 | **District multiplier applied** | Цена для "Исторический центр" = base × 1.25 |
| E3 | **Unknown district = 1.0 multiplier** | Район без данных — без множителя |
| E4 | **RENT deal type discount** | Аренда = 0.006 от стоимости продажи |
| E5 | **Studio rooms mapping** | `rooms: 0` → ключ 'studio' |
| E6 | **4+ rooms capped at 4** | `rooms: 5` → ключ 4 |
| E7 | **Typical area fallback** | Без `total_area` используется типичная площадь |
| E8 | **Analogs generation** | Возвращает 3 варианта (Эконом/Средний/Премиум) |
| E9 | **Avito URL generation** | Корректная URL с параметрами |
| E10 | **Confidence level** | HIGH при известном районе, MEDIUM иначе |

#### 3.1.4. Sanitize (`src/context/supabaseSync.js`)

| # | Тест | Описание |
|---|------|----------|
| S1 | **Empty strings → null** | `''` заменяется на `null` |
| S2 | **Nested objects sanitized** | Рекурсивная обработка вложенных объектов |
| S3 | **Arrays sanitized** | Массивы обрабатываются корректно |
| S4 | **Null/undefined preserved** | `null` и `undefined` не ломают функцию |
| S5 | **Primitives unchanged** | Числа, булевы, строки с данными не меняются |

#### 3.1.5. Format utils (`src/utils/format.js` + `matching.js`)

| # | Тест | Описание |
|---|------|----------|
| F1 | **formatDate** | Корректный формат DD.MM.YYYY |
| F2 | **formatDateTime** | Корректный формат DD.MM.YYYY HH:MM |
| F3 | **cleanPrice** | Извлечение числа из строки с символами |
| F4 | **formatPrice** | Форматирование "10 млн ₽" / "5 000 ₽" |
| F5 | **getLevelLabel** | correct labels: perfect/good/possible |

### 3.2. Component-тесты (Приоритет: ВЫСОКИЙ)

#### 3.2.1. Формы

| # | Компонент | Тест |
|---|-----------|------|
| C1 | `Clients/FormPage` | Создание клиента: заполнение формы → вызов dispatch с `ADD_CLIENT` |
| C2 | `Clients/FormPage` | Валидация обязательных полей (имя, телефон) |
| C3 | `Clients/FormPage` | Редактирование: предзаполнение данных |
| C4 | `Properties/FormPage` | Создание объекта: все поля заполнены → `ADD_PROPERTY` |
| C5 | `Properties/FormPage` | Валидация: цена > 0, площадь > 0 |
| C6 | `Properties/FormPage` | Тогл "торг" показывает/скрывает поле `price_min` |
| C7 | `Requests/FormPage` | Создание запроса: бюджет, районы, комнаты |

#### 3.2.2. Списки и карточки

| # | Компонент | Тест |
|---|-----------|------|
| C8 | `Clients/ListPage` | Отображение списка клиентов |
| C9 | `Clients/ListPage` | Пагинация работает (через `usePagination`) |
| C10 | `Properties/ListPage` | Фильтрация по статусу (active/sold/advertising) |
| C11 | `Matches/MatchesPage` | Отображение матчей с цветовой индикацией уровня |
| C12 | `Matches/MatchesPage` | Кнопка "Закрыть сделку" вызывает `CLOSE_DEAL` |

#### 3.2.3. Toast и ErrorBoundary

| # | Компонент | Тест |
|---|-----------|------|
| C13 | `Toast` | Показ toast-уведомления |
| C14 | `Toast` | Автозакрытие через timeout |
| C15 | `ErrorBoundary` | Перехват ошибки рендера → fallback UI |
| C16 | `ErrorBoundary` | Кнопка "Попробовать снова" |

### 3.3. Integration-тесты (Приоритет: СРЕДНИЙ)

| # | Тест | Описание |
|---|------|----------|
| I1 | **Supabase: ADD_CLIENT sync** | Dispatch `ADD_CLIENT` → вызов `supabase.from('clients').insert()` |
| I2 | **Supabase: error handling** | Ошибка Supabase → вызов `onError` + `onRollback` |
| I3 | **Supabase: retry on network error** | Сетевая ошибка → повторная попытка (до 3 раз) |
| I4 | **Supabase: no retry on RLS error** | Ошибка 42501 → без ретрая, сообщение об ошибке доступа |
| I5 | **Supabase: CLOSE_DEAL parallel sync** | `CLOSE_DEAL` → 5 параллельных запросов к Supabase |
| I6 | **Context: loadUserData** | Загрузка данных для admin vs realtor (разные задачи) |
| I7 | **Context: auth flow** | SIGNED_IN → загрузка профиля → SET_USER + SET_ALL |
| I8 | **Context: pending user rejected** | Пользователь со статусом 'pending' → signOut |

### 3.4. E2E-тесты (Приоритет: СРЕДНИЙ)

| # | Сценарий | Шаги | Ожидаемый результат |
|---|----------|------|---------------------|
| E2E1 | **Полный цикл: клиент → объект → матч → сделка** | 1. Войти в систему<br>2. Создать клиента<br>3. Создать объект<br>4. Создать запрос<br>5. Открыть матчи<br>6. Закрыть сделку | Матч найден, статус объекта "sold", клиента "deal_closed" |
| E2E2 | **Создание клиента с валидацией** | 1. Открыть форму клиента<br>2. Оставить поля пустыми<br>3. Нажать "Сохранить"<br>4. Заполнить поля<br>5. Сохранить | Ошибки валидации → успешное создание → клиент в списке |
| E2E3 | **Создание объекта со всеми полями** | 1. Открыть форму объекта<br>2. Заполнить все поля (тип сделки, тип недвижимости, адрес, цена, площадь, этаж, ремонт, оплата)<br>3. Сохранить | Объект создан, матчи рассчитаны |
| E2E4 | **Фильтрация и пагинация** | 1. Открыть список объектов<br>2. Применить фильтр по статусу<br>3. Перейти на следующую страницу | Отфильтрованный список, корректная пагинация |
| E2E5 | **Оценка стоимости объекта** | 1. Открыть страницу оценки<br>2. Выбрать город, район, комнаты<br>3. Получить оценку | Показана оценка + ссылки на Авито |
| E2E6 | **Аутентификация** | 1. Открыть login<br>2. Ввести корректные данные<br>3. Войти | Переход на Dashboard, данные загружены |
| E2E7 | **Ожидание одобрения** | 1. Зарегистрировать нового пользователя<br>2. Войти | Сообщение "Ожидает одобрения", доступ ограничен |

### 3.5. Backend-тесты (Python/pytest)

| # | Тест | Описание |
|---|------|----------|
| B1 | **AI estimation endpoint** | POST `/api/ai/estimate` → корректный ответ |
| B2 | **Estimation service** | Расчёт стоимости через backend-сервис |
| B3 | **Messaging API** | Отправка/получение сообщений |
| B4 | **Public property endpoint** | GET `/api/public/property/{id}` → данные без авторизации |
| B5 | **Search service** | Поиск на Cian/Avito/Domclick (мокированные ответы) |
| B6 | **PDF report generation** | Генерация PDF-отчёта |
| B7 | **Reminder tasks** | Celery-задачи напоминаний |

---

## 4. Структура тестовых файлов

```
realtor-match/
├── src/
│   ├── __tests__/
│   │   ├── setup.js                      # Глобальная настройка тестов
│   │   ├── mocks/
│   │   │   ├── supabase.js               # Мок Supabase клиента
│   │   │   └── handlers.js               # MSW handlers для API
│   │   └── test-utils.jsx                # Кастомные render с AppContext
│   │
│   ├── utils/
│   │   ├── matching.test.js              # Unit: matching algorithm
│   │   ├── estimation.test.js            # Unit: estimation engine
│   │   ├── format.test.js                # Unit: format utils
│   │   └── docxGenerator.test.js         # Unit: DOCX generation
│   │
│   ├── context/
│   │   ├── reducer.test.js               # Unit: all reducer actions
│   │   └── supabaseSync.test.js          # Unit: sanitize, syncAction
│   │
│   ├── hooks/
│   │   ├── usePagination.test.js         # Unit: pagination hook
│   │   └── useToast.test.js              # Unit: toast hook
│   │
│   ├── components/
│   │   ├── Toast.test.jsx                # Component: Toast
│   │   └── ErrorBoundary.test.jsx        # Component: ErrorBoundary
│   │
│   └── pages/
│       ├── Clients/
│       │   ├── FormPage.test.jsx         # Component: client form
│       │   └── ListPage.test.jsx         # Component: client list
│       ├── Properties/
│       │   ├── FormPage.test.jsx         # Component: property form
│       │   └── ListPage.test.jsx         # Component: property list
│       ├── Matches/
│       │   └── MatchesPage.test.jsx      # Component: matches page
│       └── Auth/
│           └── LoginPage.test.jsx        # Component: auth
│
├── e2e/
│   ├── fixtures.js                       # Playwright fixtures
│   ├── helpers.js                        # E2E helper functions
│   ├── auth.spec.js                      # E2E: authentication
│   ├── client-flow.spec.js               # E2E: client CRUD
│   ├── property-flow.spec.js             # E2E: property CRUD
│   ├── matching-flow.spec.js             # E2E: matching + deal
│   └── estimation-flow.spec.js           # E2E: estimation
│
├── backend/
│   └── app/
│       ├── api/
│       │   ├── test_ai.py                # Backend: AI API tests
│       │   ├── test_estimation.py        # Backend: estimation API
│       │   └── test_messaging.py         # Backend: messaging API
│       └── services/
│           ├── test_estimation_service.py
│           └── test_search_service.py
│
├── vitest.config.js
├── playwright.config.js
└── package.json  (scripts: test, test:watch, test:coverage, test:e2e)
```

---

## 5. Pre-deployment чек-лист

### 5.1. Unit-тесты

- [ ] Все тесты matching-алгоритма проходят (M1-M20)
- [ ] Все тесты reducer проходят (R1-R12)
- [ ] Все тесты estimation engine проходят (E1-E10)
- [ ] Все тесты sanitize проходят (S1-S5)
- [ ] Все тесты format utils проходят (F1-F5)
- [ ] Покрытие кода >= 70% (lines), >= 60% (branches)
- [ ] Нет failing тестов в CI

### 5.2. Component-тесты

- [ ] Формы клиентов: создание, редактирование, валидация (C1-C3)
- [ ] Формы объектов: создание, валидация, торг (C4-C6)
- [ ] Списки: пагинация, фильтрация (C8-C10)
- [ ] Матчи: отображение, закрытие сделки (C11-C12)
- [ ] Toast и ErrorBoundary работают (C13-C16)

### 5.3. Integration-тесты

- [ ] Supabase sync: CRUD операции (I1, I5)
- [ ] Обработка ошибок Supabase (I2-I4)
- [ ] Auth flow: login, logout, pending user (I6-I8)

### 5.4. E2E-тесты

- [ ] Полный цикл клиент-объект-матч-сделка (E2E1)
- [ ] Создание клиента с валидацией (E2E2)
- [ ] Создание объекта со всеми полями (E2E3)
- [ ] Фильтрация и пагинация (E2E4)
- [ ] Оценка стоимости (E2E5)
- [ ] Аутентификация (E2E6)
- [ ] Ожидание одобрения (E2E7)

### 5.5. Backend-тесты

- [ ] Все API endpoints отвечают корректно (B1-B4)
- [ ] Сервисы работают с моками (B5-B7)

### 5.6. Ручная проверка (критические сценарии)

- [ ] **Данные не теряются** при обновлении страницы (Supabase persistence)
- [ ] **Матчи рассчитываются корректно** при создании объекта/запроса
- [ ] **Закрытие сделки** обновляет все связанные записи
- [ ] **Ошибки Supabase** отображаются пользователю (не alert, а toast)
- [ ] **Админ** видит pending пользователей, может approve/reject
- [ ] **Routeguard** защищает страницы от неавторизованных
- [ ] **Мобильная версия** работает (responsive)
- [ ] **PWA** устанавливается на устройство

### 5.7. Производительность

- [ ] Initial load < 3 секунд (Lighthouse)
- [ ] Time to Interactive < 5 секунд
- [ ] Bundle size < 500 KB (gzip)
- [ ] Нет утечек памяти при длительной работе (DevTools Memory)

### 5.8. Безопасность

- [ ] RLS policies настроены в Supabase
- [ ] Нет секретов в клиентском коде (SUPABASE_ANON_KEY — ок, SERVICE_ROLE — нет)
- [ ] XSS-защита: все пользовательские данные через `{}` а не `dangerouslySetInnerHTML`
- [ ] CSRF-защита (Supabase обрабатывает)

---

## 6. План внедрения (рекомендуемый порядок)

### Фаза 1: Фундамент (1-2 дня)
1. Установить Vitest, RTL, jsdom
2. Настроить `vitest.config.js` и `setup.js`
3. Написать тесты для `matching.js` (20 тестов) — **самый критичный модуль**
4. Написать тесты для `reducer.js` (12 тестов)

### Фаза 2: Утилиты и хуки (1 день)
5. Тесты `estimation.js` (10 тестов)
6. Тесты `supabaseSync.js` — `sanitizeObj` (5 тестов)
7. Тесты `format.js` (5 тестов)
8. Тесты `usePagination`, `useToast`

### Фаза 3: Компоненты (2-3 дня)
9. Toast, ErrorBoundary
10. Формы: Clients, Properties, Requests
11. Списки: Clients, Properties
12. Matches page

### Фаза 4: Integration (1-2 дня)
13. Supabase sync с моками
14. Auth flow
15. Context loading

### Фаза 5: E2E (2-3 дня)
16. Настроить Playwright
17. Auth flow E2E
18. Client CRUD E2E
19. Property CRUD E2E
20. Full deal cycle E2E

### Фаза 6: Backend (1-2 дня)
21. pytest для API endpoints
22. pytest для сервисов

### Итого: ~8-13 рабочих дней

---

## 7. Примеры тестовых файлов

См. файлы в директории `__tests__/` проекта (созданы отдельно).
