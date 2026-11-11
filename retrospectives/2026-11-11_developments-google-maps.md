# Ретроспектива сессии: 2026-11-11_developments-google-maps

1. **Какая задача стояла:**
   - На странице новостроек (`/developments`) не работали Яндекс.Карты и OpenStreetMap; нужно было разобраться и подключить Google Карты (с оркестрацией `make-feature`).
2. **Как решали:**
   - Диагностировали реальные причины в Playwright: у OpenStreetMap в `DevelopmentsMap.jsx` отсутствовал сегмент `/{y}` в шаблоне URL тайлов (`{z}/{x}.png` -> HTTP 400), а в `DevelopmentsPage.jsx` контейнер `.dev-content-layout.split` из-за `flex: 1` растягивался до `5617px`, уводя центр карты Кирова и маркеры далеко за пределы экрана.
   - Добавили поддержку Google Карт (`mt{s}.google.com/vt/lyrs=m|y|s`) через единый параметризованный `DevelopmentsMap.jsx` и обёртку `DevelopmentsGoogleMap.jsx` со слоями Схема / Гибрид / Спутник, сделали `google` провайдером по умолчанию.
   - Исправили `/{y}` в OSM, добавили обработку `tileerror`/`tileload`, исправили stale closure в `DevelopmentsYandexMap.jsx` и ограничили высоту split/mobile контейнеров в `DevelopmentsPage.jsx`.
3. **Результат:**
   - [x] Решена полностью (для десктопа и мобильного; зафиксирован неблокирующий нюанс на 390px с перекрытием верхнего края попапа панелью слоёв из-за `.leaflet-map-pane` `z-index: 400`)
4. **Что можно было сделать лучше:**
   - Сразу вынести переключатель слоёв Google Карт как `L.Control` или задать `autoPanPaddingTopLeft` у попапов, чтобы на узком мобильном экране верх попапа не пересекался с панелью слоёв.
5. **Что нового узнали о проекте или окружении:**
   - В `.env` нет `VITE_GOOGLE_MAPS_KEY` и `VITE_YANDEX_MAPS_KEY`, но публичные тайлы `mt{s}.google.com/vt/lyrs=...` грузятся в Chromium со статусом `200` без API-ключа.
   - При использовании кастомных overlay-панелей поверх Leaflet нужно помнить, что `.leaflet-map-pane` создаёт stacking context с `z-index: 400`, ограничивающий `.leaflet-popup-pane` (`700`) относительно внешних sibling-элементов.
