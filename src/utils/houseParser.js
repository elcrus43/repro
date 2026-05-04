/**
 * houseParser.js
 * Парсит характеристики жилого дома из открытых источников через Gemini + Google Search.
 * Возвращает структурированный объект, совместимый с полями формы объекта.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Маппинг значений на ключи building_type
const BUILDING_TYPE_MAP = {
    панел:    'panel',
    кирпич:   'brick',
    монолит:  'monolith',
    дерев:    'wood',
    блок:     'block',
    деревян:  'wood',
    'panel':  'panel',
    'brick':  'brick',
    'monolith': 'monolith',
};

function normalizeBuildingType(raw) {
    if (!raw || raw === 'null') return '';
    const lower = raw.toLowerCase();
    for (const [keyword, key] of Object.entries(BUILDING_TYPE_MAP)) {
        if (lower.includes(keyword)) return key;
    }
    return '';
}

function safeInt(v) {
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
}

function safeFloat(v) {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
}

/**
 * Запрашивает Gemini с grounding для получения данных о доме.
 * @param {string} address - Улица и номер дома
 * @param {string} city    - Город
 * @returns {Promise<HouseData>}
 */
export async function parseHouseFromAddress(address, city) {
    if (!GEMINI_API_KEY) {
        throw new Error('Добавьте VITE_GEMINI_API_KEY в файл .env');
    }
    if (!address && !city) {
        throw new Error('Укажите адрес для поиска');
    }

    const location = [address, city].filter(Boolean).join(', ');

    const prompt = `Найди в интернете технические характеристики жилого дома по адресу: "${location}", Россия.
Используй такие сайты как: dom.mingkh.ru, reformagkh.ru, 2gis.ru, яндекс карты, google maps, и другие открытые источники.

Верни данные СТРОГО в формате JSON (только JSON, без markdown-блоков, без пояснений):
{
  "year_built": число или null,
  "floors_total": число или null,
  "building_type": "panel|brick|monolith|wood|block или текстовое описание или null",
  "apartments_count": число или null,
  "has_elevator": true или false или null,
  "has_garbage_chute": true или false или null,
  "ceiling_height": число в метрах или null,
  "series": "серия или проект дома или null",
  "developer": "застройщик или null",
  "management_company": "управляющая компания или null",
  "cadastral_number": "кадастровый номер или null",
  "source": "название источника, откуда взяты данные"
}

Если какой-то параметр не найден — ставь null. Только JSON.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 600 },
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        let msg = `Ошибка API: ${res.status}`;
        try {
            const parsed = JSON.parse(errText);
            msg = parsed?.error?.message || msg;
        } catch {}
        throw new Error(msg);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Extract JSON — sometimes Gemini wraps it in ```json ... ```
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Не удалось распознать ответ. Попробуйте уточнить адрес.');
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch {
        throw new Error('Ошибка разбора данных. Попробуйте ещё раз.');
    }

    // Normalize to form-compatible fields
    return normalizeHouseData(parsed);
}

/**
 * Нормализует сырой ответ Gemini в поля формы.
 */
function normalizeHouseData(raw) {
    const result = {
        // Form fields (direct mapping)
        build_year:         safeInt(raw.year_built),
        floors_total:       safeInt(raw.floors_total),
        building_type:      normalizeBuildingType(raw.building_type),
        // Extra info fields (new columns)
        apartments_count:   safeInt(raw.apartments_count),
        has_elevator:       raw.has_elevator === true  ? true  : raw.has_elevator === false ? false : null,
        has_garbage_chute:  raw.has_garbage_chute === true ? true : raw.has_garbage_chute === false ? false : null,
        ceiling_height:     safeFloat(raw.ceiling_height),
        house_series:       (raw.series && raw.series !== 'null') ? raw.series : null,
        developer:          (raw.developer && raw.developer !== 'null') ? raw.developer : null,
        management_company: (raw.management_company && raw.management_company !== 'null') ? raw.management_company : null,
        cadastral_number:   (raw.cadastral_number && raw.cadastral_number !== 'null') ? raw.cadastral_number : null,
        // Meta
        _source: raw.source || 'Gemini Search',
        _rawBuildingType: raw.building_type, // для отображения если не распознан
    };

    // Remove nulls for clean merging
    return Object.fromEntries(Object.entries(result).filter(([, v]) => v !== null && v !== undefined && v !== ''));
}

/**
 * Возвращает список полей, которые были найдены (для отображения пользователю).
 */
export function describeParsedFields(data) {
    const labels = {
        build_year:         'Год постройки',
        floors_total:       'Этажность',
        building_type:      'Тип дома',
        apartments_count:   'Количество квартир',
        has_elevator:       'Лифт',
        has_garbage_chute:  'Мусоропровод',
        ceiling_height:     'Высота потолков',
        house_series:       'Серия дома',
        developer:          'Застройщик',
        management_company: 'Управляющая компания',
        cadastral_number:   'Кадастровый номер',
    };
    const buildingTypeNames = {
        panel: 'Панель', brick: 'Кирпич', monolith: 'Монолит', wood: 'Дерево', block: 'Блок',
    };

    return Object.entries(labels)
        .filter(([key]) => data[key] !== undefined && data[key] !== null && data[key] !== '')
        .map(([key, label]) => {
            let val = data[key];
            if (key === 'building_type') val = buildingTypeNames[val] || data._rawBuildingType || val;
            if (key === 'has_elevator' || key === 'has_garbage_chute') val = val ? 'Есть' : 'Нет';
            if (key === 'ceiling_height') val = `${val} м`;
            if (key === 'build_year') val = `${val} г.`;
            if (key === 'floors_total') val = `${val} эт.`;
            if (key === 'apartments_count') val = `${val} кв.`;
            return { label, value: val };
        });
}
