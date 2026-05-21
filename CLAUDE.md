# Realtor Match (Re-Pro) — Справка проекта

<!-- Level 1: Контекст проекта. Прочитайте перед изменением любого файла. -->

## Стек технологий
| Уровень | Технологии |
|---|---|
| Frontend | React 19 + Vite 7.3 + React Router v7 |
| Стилизация | Vanilla CSS (акцент на премиальный дизайн и адаптивность) |
| Backend & DB | Supabase (PostgreSQL + Realtime) |
| AI-интеграция | Zhipu AI (GLM-4-Flash / GLM-4V-Flash) |
| Валидация адресов | DaData API (подсказки через КЛАДР/ФИАС) |

---

## Основные команды разработки

### Запуск и сборка
* Локальный сервер: `npm run dev`
* Сборка продакшена: `npm run build`
* Предпросмотр сборки: `npm run preview`
* Проверка линтером: `npm run lint`

### Тестирование
* Запуск модульных тестов (Vitest): `npm run test`
* Запуск тестов в режиме отслеживания: `npm run test:watch`
* Запуск E2E тестов (Playwright): `npm run test:e2e`
* Открытие UI Playwright: `npm run test:e2e:ui`

---

## Работа с базой данных (Supabase)
* Конфигурация подключения хранится в `.env`.
* Миграции схемы данных запускаются локальными JS-скриптами из корня проекта.
* **Полезные утилиты проверки схемы:**
  * Проверка схемы локально: `node verify-schema.mjs`
  * Проверка данных: `node verify-data.mjs`
  * Проверка специфических таблиц: `node check-db.mjs` или `node check-portfolio-schema.mjs`

---

## Правила кодирования в Windows (CRITICAL)
* **Окончания строк:** В Windows-среде Git может изменять окончания строк. Все файлы проекта должны иметь окончания строк **LF** (Line Feed) и быть в кодировке **UTF-8**.
* **Скрипты проверки:**
  * Проверить все файлы на наличие CRLF: `node check_all_crlf.mjs`
  * Автоматически исправить CRLF на LF: `node fix_all_crlf.mjs`

---

## Навигация по базе знаний проекта
Для быстрой адаптации и отслеживания принятых решений используйте папку `.notes/`:
* [Панель управления знаниями (Индекс)](file:///c:/Users/Office-40/.gemini/antigravity/scratch/realtor-match/.notes/index.md)
* [Журнал последних изменений](file:///c:/Users/Office-40/.gemini/antigravity/scratch/realtor-match/.notes/log.md)
* [Архитектурные решения (ADRs)](file:///c:/Users/Office-40/.gemini/antigravity/scratch/realtor-match/.notes/decisions/)
* [Описание сущностей схемы БД](file:///c:/Users/Office-40/.gemini/antigravity/scratch/realtor-match/.notes/facts/)
