# 📝 Журнал действий

## 2026-04-14

- [INIT] Создана структура wiki по паттерну Karpathy + MemPalace
- [BUILD] Сборка успешна: vite build ✓ (20.06s, 1846 модулей)
- [COMMIT] `d3764e3` chore: обновить настройки qwen и конфигурацию vite для поддержки env
- [DISCOVER] Ошибка импорта CITIES исправлена (перенесён из constants.js в location.js)
- [INGEST] Дополнены факты о проекте: Clients, Showings, Requests, Deals
- [INGEST] Созданы страницы: tech-stack.md (полный), clients.md, showings.md, requests.md, deals.md
- [COMMIT] `890b60a` docs: инициализация wiki структуры
- [COMMIT] `64dc8ae` docs: дополнены факты о проекте - клиенты, показы, запросы, сделки
- [COMMIT] `7f07a87` chore: добавлены временные файлы .notes в gitignore
- [ISSUE] ISSUE-002: данные не сохраняются (клиенты, показы)
- [FIX] supabaseSync.js: исправлена нормализация phones → phone + phone_2
- [FIX] useDbDispatch.js: добавлен realtor_id для показов
- [MIGRATION] 030_fix_clients_and_showings_save_issues.sql создана
- [ADR] ADR-001: исправление проблем с сохранением данных

_Формат: `[ТИП] Описание`_
_Типы: INIT, BUILD, COMMIT, DISCOVER, FIX, DECISION, ISSUE, INGEST_
