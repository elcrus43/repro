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

## 2026-05-04
- [BUILD] Сборка успешна: vite build ✓ (21.43s)
- [TEST] Выявлены ошибки в src/utils/format.test.js и src/utils/estimation.test.js
- [FIX] matching.js: исправлены cleanPrice и formatPrice для соответствия тестам
- [FIX] estimation.js: исправлена логика confidence (HIGH для известных районов с множителем 1.0)
- [TEST] Все тесты пройдены: 135/135 ✓
- [FIX] AdGenerator.jsx: обновление модели до gemini-2.5-flash (v1 API), так как 1.5 и 2.0 устарели
- [FIX] AdGenerator.jsx: уточнение промпта (запрет слов "уникальный", жесткая структура первого абзаца "Продаю...", импорт BUILDING_TYPES)
- [VERIFY] Структура кода соответствует ISSUE-002 и ADR-001

_Формат: `[ТИП] Описание`_
_Типы: INIT, BUILD, COMMIT, DISCOVER, FIX, DECISION, ISSUE, INGEST, TEST, VERIFY_
2 0 2 6 - 0 5 - 0 6 T 0 8 : 1 1 : 0 0 Z   -   V e r i f i e d   a n d   c o m m i t t e d   P o r t f o l i o   F i l e   M a n a g e m e n t   i m p l e m e n t a t i o n   i n c l u d i n g   U I   m o d i f i c a t i o n s   t o   D e t a i l s P a g e . j s x ,   P o r t f o l i o S e c t i o n . j s x ,   A I   b a c k e n d   c h a n g e s   a n d   m i g r a t i o n   0 3 4   e x e c u t i o n  

## 2026-06-11
- [FIX] Создана утилита `src/utils/importDecoder.js` для безопасного декодирования данных импорта.
- [FIX] В `FormPage.jsx` подборов и свойств интегрирован `decodeImportData` с исправлением ошибки, когда `+` превращался в пробел.
- [FIX] В расширении браузера `extension/popup.js` добавлено кодирование URL через `encodeURIComponent`.
- [TEST] Добавлены тесты `src/utils/importDecoder.test.js`. Все 159 тестов успешно пройдены.
- [FIX] В `Selection/FormPage.jsx` добавлена генерация ID, realtor_id и меток времени на стороне клиента для надёжного сохранения подборов.
- [FIX] Применены маски форматирования для полей телефона (с помощью `formatPhone`) и цены в форме подбора.

## 2026-11-12
- [DISCOVER] ��� ������ analog_listings �� Neon; ������ ������ ��� (��������� last_seen_at - 2026-06-24).
- [DECISION] ����� ���������� ����� ������ ��������� ������ avito-parser (realtor_sync.py) � �� �� Neon analog_listings.
- [BUILD] realtor_sync.py: 5 ���������, ���������, ���������� ������� Playwright, upsert �� (source, source_id), analog_price_history.
- [FIX] api/ai-proxy.js: ��� ��������� last_seen_at �� CMA_FRESH_DAYS=30, ��������� sample_size, data_as_of, data_stale.
- [FIX] CmaReport.jsx: ���������� ������ ������� � ���� ����������.
- [VERIFY] ����� ������ �� ������: 283 ����������, ������� 2-����. 45 ��.� ~5.7 ���.
- [VERIFY] ������ ����� ������: 3146 �������� ����������, 510 ���������� ��������������. �������� ����� ���������� �� 16-� �������� ��-�� soft-block, ����� ������� 17+ ������������.
- [FIX] ��� �������� ������� ����� ORDER BY last_seen_at DESC LIMIT 50, ������� ������ �������� �� ������� ������. �������� �� ORDER BY id LIMIT 500, ������� ������� �� 322 ��������.
- [VERIFY] �����: �������� 1714, ����� 4057 ��������. ������� 2-����. 50 ��.�: 5.58-6.59-7.65 ���.
- [VERIFY] ����� ������ ��������: 4100 �������� ���������� (�������� 1763, ���� 893, ����������� 851, ������ 446, ������� 147). ���: 2-����. 50 ��.� - 5.58-6.59-7.67 ���, ���������� -1.3%.
