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

## 2026-11-13
- [BUILD] api/_tiktok-report.js - ядро ежедневного TikTok-дайджеста: revid.ai (прирост за 24ч), convosight.com (сюжеты по регионам), fypnow.com (недельные тренды ниши «недвижимость» + месячный топ-20 с множителем).
- [BUILD] api/tiktok-report.js + vercel.json - Vercel cron 0 4 * * * (07:00 МСК) с авторизацией по CRON_SECRET, отправка в Telegram тем же ботом, что и security-alerts.
- [BUILD] scripts/tiktok-daily-report.mjs - ручной запуск: консоль, markdown в .notes/tiktok-trends/YYYY-MM-DD.md, флаги --dry-run / --no-send / --no-file.
- [DECISION] Вывод дайджеста - вирусный ХУК, а не вирусное видео: берётся скелет фразы (инструкция/раскрытие/вопрос/запрет/дедлайн/признание), он натягивается на падежные формы боли ниши (PAIN_CASES), в кадре только свой материал.
- [TEST] tests/api/tiktok-report.test.js - 17 тестов: парсеры по слепкам вёрстки, классификация скелета, fetchVideoHook (блокировка по IP, битый JSON), сборка отчёта и сообщения.
- [DISCOVER] www.tiktok.com с текущего IP отдаёт webapp.video-detail.statusCode 10204 (ru_cross_border_block): подписи нишевых роликов читаются только с серверного egress, для локального запуска добавлен флаг --direct с честной пометкой в errors.
- [FIX] scripts/tiktok-daily-report.mjs переименован в .js: *.mjs исключён в .gitignore, скрипт не попадал в коммит.
- [ISSUE] npm run lint даёт ~270 ошибок в файлах, которых я не касался (vite.config.js, src/utils/logger.js и др.) - шум от соседних WIP-правок, мои файлы чисты.
- [ISSUE] api/security-alerts.js содержит Telegram-токен и chat_id литералом в коде (fallback) - секрет уже в истории git, нужна ротация токена и перенос только в env.
- [ISSUE] .notes/log.md: записи от 2026-11-12 сохранены с U+FFFD (текст потерян при записи через PowerShell в кодовой странице OEM) - нарушен п.1 Конституции про UTF-8, писать в файлы надо node-скриптом с явным 'utf8'.
