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
- **Кировский ССК** (`kssk.ru`) - Скандинавия, Метро, Слобода, Х2, Дом у реки, Пушкина
- **ПрофСтрой** (`profstroy-kirov.ru`) - Метрополис, Вдохновение, Капитал, Гармония, Дом на Мурашинском 7
- **Стройсоюз** (`stroysoyuz43.ru`) - Заповедный, Репинские пруды, Слобода Соломинцы, Премьер, На Успенской
- **КИНО Девелопмент** (`кинодевелопмент.рф`) - Горького 2А, Fusion, Ютерра
- **СМУ-5** (`smu5kirov.ru`) - Маяк, Современник, Рудницкого 32
- **Алтай-Строй / СМТ** (`altai-stroi.org`) - Династия, Оникс, Ердякова 9
- **УКС АВИТЕК** (`uks-avitek.ru`) - Крылья, Советская 75, Ердякова 19А (через live-фид)
- **СМУ-16** (`smu16.ru`) - Дом на Красина, 6

## 3. Проверенные координаты карты
При добавлении или обновлении адресов обязательно синхронизировать:
1. `DEFAULT_DEVELOPMENTS` в `src/data/developmentsData.js` (и увеличивать `CATALOG_VERSION` для сброса кеша браузера).
2. `public/data/developments.json`.
3. `VERIFIED_HOUSE_ENTRIES` в `src/lib/houseCoordinates.js` (если дом с live-лотами имеет отдельный пин).
