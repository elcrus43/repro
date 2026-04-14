# 📚 Re-Pro Wiki — Индекс знаний

## 🏛 Дворец проекта (MemPalace)

### Крылья (Wings)
- **wing_project** — проект Re-Pro (realtor-match)
  - **hall_facts** → [facts/](facts/) — базовые факты о проекте
    - [tech-stack.md](facts/tech-stack.md) — полный обзор всех сущностей
    - [clients.md](facts/clients.md) — клиенты (типы, статусы, связи)
    - [showings.md](facts/showings.md) — показы (планирование, проведение)
    - [requests.md](facts/requests.md) — запросы клиентов (критерии поиска)
    - [deals.md](facts/deals.md) — сделки (финальные соглашения)
  - **hall_events** → [events/](events/) — ключевые события разработки
  - **hall_decisions** → [decisions/](decisions/) — архитектурные решения (ADRs)
    - [ADR-001](decisions/ADR-001-fix-data-persistence.md) — исправление сохранения данных
  - **hall_patterns** → [patterns/](patterns/) — обнаруженные паттерны кода
  - **hall_issues** → [issues/](issues/) — проблемы и их решения
    - [ISSUE-001](issues/ISSUE-001-cities-import.md) — ошибка импорта CITIES
    - [ISSUE-002](issues/ISSUE-002-data-persistence.md) — данные не сохраняются

### Структура файлов
```
.notes/
├── index.md                 # Этот файл
├── log.md                   # Журнал всех действий
├── schema.md                # Правила и соглашения
├── facts/                   # Факты о проекте
│   └── tech-stack.md
├── events/                  # События (релизы, миграции)
│   └── YYYY-MM-DD-<event>.md
├── decisions/               # ADRs
│   └── ADR-<NNN>-<title>.md
├── patterns/                # Паттерны кода
│   └── <pattern-name>.md
├── issues/                  # Проблемы и фиксы
│   └── ISSUE-<NNN>-<title>.md
└── _templates/              # Шаблоны для новых страниц
    ├── decision.md
    ├── issue.md
    └── pattern.md
```

## 📖 Как использовать

### Добавление знаний (Ingest)
1. Изучить файл/компонент
2. Создать/обновить страницу в соответствующей папке
3. Обновить этот индекс
4. Добавить запись в [log.md](log.md)

### Поиск информации (Query)
1. Найти нужную страницу через этот индекс
2. Прочитать и синтезировать ответ
3. Ценные выводы сохранить как новую страницу

### Проверка целостности (Lint)
- Проверить на противоречия между страницами
- Обновить устаревшие данные
- Добавить связи между связанными страницами
- Выявить пробелы в знаниях

## 🏷 Методанные

- **Проект**: Re-Pro (realtor-match)
- **Стек**: React 19 + Vite 7.3 + Supabase
- **Создано**: 2026-04-14
- **Обновлено**: 2026-04-14
