# 2026-11-26 - Автопроверка и запись клиентов в Google Контакты

## Задача
При вводе номера телефона клиента сразу проверять его наличие в Google Контактах, и если контакт не найден - сохранять клиента не только в CRM, но и в Google Контакты.

## Что сделано
1. **Google OAuth scope и токен (`src/lib/googleCalendar.js`, `src/pages/Profile/ProfilePage.jsx`):**
   - Расширен `GOOGLE_SCOPES` до `calendar.events` + `https://www.googleapis.com/auth/contacts`.
   - Экспортирован `getGoogleAccessToken` для переиспользования существующей серверной OAuth-сессии (refresh token в Neon DB).
2. **Клиент Google People API (`src/lib/googleContacts.js`, `src/lib/googleContacts.test.js`):**
   - `normalizePhoneForGoogle` / `phonesMatch` - корректная нормализация без ложных срабатываний на неполный ввод `+7 (...)`.
   - `searchGoogleContactByPhone` - поиск по Google Contacts (`people:searchContacts`) с обработкой `not_connected`, `insufficient_scope`, `found`, `not_found`.
   - `createGoogleContact` - создание контакта (`people:createContact`) с ФИО, телефонами, email, организацией `REA CRM` и заметкой, с предварительной защитой от дубликатов.
3. **UI и формы (`src/hooks/useGoogleContactCheck.js`, `src/components/GoogleContactStatusBadge.jsx`, `src/pages/Clients/FormPage.jsx`, `src/pages/Clients/PipelinePage.jsx`):**
   - Живая дебаунс-проверка номера при вводе в карточке нового клиента и в модалке быстрого добавления в воронке.
   - При совпадении в Google Контактах показывается имя контакта и кнопка «Подставить имя».
   - При отсутствии в Google Контактах - галочка (включена по умолчанию) и автоматическая запись в CRM + Google Контакты при сохранении.

## Что можно улучшить / заметки
- Если пользователь ранее подключал Google Календарь без scope `contacts`, интерфейс подскажет переподключить Google в Профиле.
- В Google Cloud Console должен быть включён **Google People API**.
