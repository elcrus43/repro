# 📐 Schema — Правила и соглашения проекта

## 🏗 Архитектура проекта

### Стек технологий
- **Frontend**: React 19.2 (без TypeScript)
- **Сборщик**: Vite 7.3.1
- **Роутинг**: React Router DOM 7.13
- **Бэкенд**: Supabase (аутентификация, БД PostgreSQL)
- **Хранение изображений**: Cloudinary
- **UI иконки**: Lucide React
- **Документы**: docxtemplater, xlsx, file-saver

### Структура проекта
```
src/
├── __mocks__/        # Моки для тестов
├── __tests__/        # Тесты
├── assets/           # Статические ресурсы
├── components/       # Переиспользуемые компоненты
├── context/          # React контексты (AppContext, Toast)
├── data/             # Константы, конфигурация
├── hooks/            # Кастомные хуки
├── lib/              # Утилиты и библиотеки
├── pages/            # Страницы приложения
└── utils/            # Утилиты
```

### Разделение кода (manualChunks)
- `vendor`: react, react-dom, react-router-dom
- `supabase`: @supabase/supabase-js
- `docx`: docxtemplater, pizzip, file-saver
- `xlsx`: xlsx

## 📝 Соглашения

### Форматирование
- JSX файлы: `.jsx`
- ESLint настроен с react-hooks и react-refresh плагинами
- Prettier не настроен (используется стандартный стиль)

### Тестирование
- Unit/Integration: Vitest + Testing Library
- E2E: Playwright
- Команды: `npm test`, `npm run test:e2e`

### Сборка
- Минификация: Terser
- Удаление console.log/debug из продакшена
- Target: ESNext

### Окружение
- `.env` файлы загружаются через `loadEnv` в vite.config.js
- Переменные: `VITE_CLOUDINARY_CLOUD_NAME` и др.

## 🔄 Рабочий процесс

### Ingest (добавление знаний)
1. Изучить код/компонент
2. Создать страницу в `.notes/<category>/`
3. Обновить [index.md](index.md)
4. Добавить запись в [log.md](log.md)

### Query (запрос к wiki)
1. Найти страницы через index.md
2. Синтезировать ответ
3. Сохранить ценные выводы как новую страницу

### Lint (проверка целостности)
- Проверить на противоречия
- Обновить устаревшие данные
- Добавить связи между страницами

## 🎯 CI/CD Pipeline

```
push → GitHub Actions → Vercel Deploy
```

- Автоматический деплой после push в master
- 6 локальных коммитов не отправлены в origin
