# ISSUE-001 — Ошибка импорта CITIES из constants.js

## Метаданные
- **Дата**: 2026-04-14
- **Статус**: ✅ Решена
- **Критичность**: Высокая (блокировала сборку)
- **Компонент**: `src/pages/Properties/FormPage.jsx`

## Описание проблемы
При сборке возникала ошибка:
```
"CITIES" is not exported by "src/data/constants.js", imported by "src/pages/Properties/FormPage.jsx"
```

## Причина
В `FormPage.jsx` был импорт:
```js
import { PROPERTY_TYPES, CITIES } from './../../data/constants';
```
Но `CITIES` экспортируется только из `src/data/location.js`, а не из `constants.js`.

## Решение
Исправлен импорт на:
```js
import { PROPERTY_TYPES } from '../../data/constants';
import { CITIES, KIROV_DISTRICTS } from '../../data/location';
```

## Файлы
- `src/pages/Properties/FormPage.jsx` — исправлен импорт
- `src/data/location.js` — содержит CITIES и KIROV_DISTRICTS
- `src/data/constants.js` — содержит PROPERTY_TYPES и другие константы

## Связи
- Связано: [tech-stack.md](../facts/tech-stack.md)
