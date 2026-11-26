# База знаний по новостройкам и застройщикам г. Кирова

## 1. Архитектура данных в каталоге
Все изменения по новостройкам и застройщикам вносятся централизованно в каталог:
- Данные ЖК: `src/data/developmentsData.js` (`DEFAULT_DEVELOPMENTS`, `CATALOG_VERSION`) и `public/data/developments.json`
- Геокодированные координаты домов: `src/lib/houseCoordinates.js` (`VERIFIED_HOUSE_ENTRIES`)
- База знаний и профили застройщиков: `src/data/developersKnowledgeBase.js` (`DEVELOPERS_KNOWLEDGE`, `NEW_BUILDINGS_GUIDE`)
- Векторные логотипы застройщиков: `src/components/DeveloperLogo.jsx`
- UI каталога, карточек застройщиков и базы знаний: `src/pages/Developments/DevelopmentsPage.jsx`, `src/pages/Developments/DevelopersKnowledgeSection.jsx`, `src/pages/Developments/DevelopmentCard.jsx`

## 2. Подключённые застройщики и live-фиды
- **Железно** (`zhcom.ru`) - Дом «Булычев», ЖК ZNAK, ЖК Зарядное, ЖК Инноград
- **Кировспецмонтаж (КСМ)** (`ksm-kirov.ru`) - Чистые Пруды, Лайф, Сити Парк, Видный, River Park, Озерки
- **Кировский ССК** (`kvartiry.kssk.ru`) - Скандинавия, Метро, Слобода, Х2, Дом у реки, Пушкина
- **ПрофСтрой** (`https://xn----dtbfdhlbb8adiakbpbqnfoz7q.xn--p1ai/`, профстрой-недвижимость.рф) - Метрополис, Вдохновение, Капитал, Гармония, Дом на Мурашинском 7 (планировки: `api/_profstroy-lots.js`)
- **Стройсоюз** (`stroy-soyuz.ru`) - Заповедный, Репинские пруды, Слобода Соломинцы, Премьер, На Успенской
- **КИНО Девелопмент** (`kino-dev.ru`) - Горького 2А, Fusion, Ютерра
- **СМУ-5** (`smu5kirov.ru`) - Маяк, Современник, Рудницкого 32
- **Алтай-Строй / СМТ** (`altai-stroi.org`) - Династия, Оникс, Ердякова 9
- **УКС АВИТЕК** (`uksavitek.ru`) - Крылья, Советская 75, Ердякова 19А (через live-фид)
- **СМУ-16** (`smu16.ru`) - Дом на Красина, 6
- **Фирма Маяковская** (`mayakovskaya.ru`) - ул. Красной Звезды, 34, ул. Рудницкого, 7
- **СК «Сретенский посад»** (`sretenskyposad.ru`) - ЖК «Соловьи», дом на ул. Дерендяева

## 3. Разделение источников: фото/информация ЖК vs планировки
- **Фото и информация по ЖК** (рендеры, фото стройки, описания, ссылки): обновляются с актуальных страниц проектов `https://ksm-kirov.ru/` и `https://kvartiry.kssk.ru/` (скрипт `scripts/sync-developments-info.js`).
- **Планировки и свободные квартиры:** обновляются по действующим парсерам лотов (`api/_ksm-lots.js`, `api/_kssk-lots.js` и др.) ежедневно в 08:00 МСК (`/api/cron-lots?provider=all`).

## 4. Проверенные координаты карты
При добавлении или обновлении адресов обязательно синхронизировать:
1. `DEFAULT_DEVELOPMENTS` в `src/data/developmentsData.js` (и увеличивать `CATALOG_VERSION` для сброса кеша браузера).
2. `public/data/developments.json`.
3. `VERIFIED_HOUSE_ENTRIES` в `src/lib/houseCoordinates.js` (если дом с live-лотами имеет отдельный пин).
