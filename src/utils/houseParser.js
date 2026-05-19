/**
 * houseParser.js
 * Парсит характеристики жилого дома с dom.mingkh.ru через Gemini + Google Search.
 * Возвращает структурированный объект, совместимый с полями формы объекта.
 */

const ZHIPU_API_KEY = import.meta.env.VITE_ZHIPU_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;

// ─── Маппинг городов на slug для dom.mingkh.ru ───────────────────────────────
const CITY_SLUGS = {
    'Киров':          { region: 'kirovskaya-oblast', city: 'kirov' },
    'Москва':         { region: 'moskva',            city: 'moskva' },
    'Санкт-Петербург':{ region: 'sankt-peterburg',   city: 'sankt-peterburg' },
    'Казань':         { region: 'tatarstan',          city: 'kazan' },
    'Нижний Новгород':{ region: 'nizhegorodskaya-oblast', city: 'nizhniy-novgorod' },
    'Самара':         { region: 'samarskaya-oblast',  city: 'samara' },
    'Уфа':            { region: 'bashkortostan',      city: 'ufa' },
    'Екатеринбург':   { region: 'sverdlovskaya-oblast', city: 'yekaterinburg' },
    'Новосибирск':    { region: 'novosibirskaya-oblast', city: 'novosibirsk' },
    'Пермь':          { region: 'permskiy-kray',      city: 'perm' },
    'Воронеж':        { region: 'voronezhskaya-oblast', city: 'voronezh' },
    'Красноярск':     { region: 'krasnoyarskiy-kray', city: 'krasnoyarsk' },
    'Саратов':        { region: 'saratovskaya-oblast', city: 'saratov' },
    'Краснодар':      { region: 'krasnodarskiy-kray', city: 'krasnodar' },
    'Тюмень':         { region: 'tyumenskaya-oblast', city: 'tyumen' },
    'Ижевск':         { region: 'udmurtiya',          city: 'izhevsk' },
    'Барнаул':        { region: 'altayskiy-kray',     city: 'barnaul' },
    'Ульяновск':      { region: 'ulyanovskaya-oblast', city: 'ulyanovsk' },
    'Владивосток':    { region: 'primorskiy-kray',    city: 'vladivostok' },
    'Ярославль':      { region: 'yaroslavskaya-oblast', city: 'yaroslavl' },
    'Иркутск':        { region: 'irkutskaya-oblast',  city: 'irkutsk' },
    'Хабаровск':      { region: 'khabarovskiy-kray',  city: 'khabarovsk' },
    'Томск':          { region: 'tomskaya-oblast',    city: 'tomsk' },
    'Оренбург':       { region: 'orenburgskaya-oblast', city: 'orenburg' },
    'Кемерово':       { region: 'kemerovskaya-oblast', city: 'kemerovo' },
    'Рязань':         { region: 'ryazanskaya-oblast', city: 'ryazan' },
    'Астрахань':      { region: 'astrakhanskaya-oblast', city: 'astrakhan' },
    'Набережные Челны':{ region: 'tatarstan',         city: 'naberezhnye-chelny' },
    'Липецк':         { region: 'lipetskaya-oblast',  city: 'lipetsk' },
    'Тула':           { region: 'tulskaya-oblast',    city: 'tula' },
    'Киров (Кировская)': { region: 'kirovskaya-oblast', city: 'kirov' },
};

/**
 * Строит slug улицы из строки адреса.
 * "ул. Ленина, д. 10" → "lenina-ulica"
 */
function buildStreetSlug(address) {
    if (!address) return '';

    // Убираем номер дома (д. 10, 10а, корп. 2 и т.д.)
    const noHouse = address
        .replace(/,?\s*(д\.?\s*)?[\d]+[а-яёА-ЯЁa-zA-Z]*(\/\d+)?\s*(корп\.?\s*\d+)?/gi, '')
        .replace(/,?\s*к\.?\s*\d+/gi, '')
        .replace(/,?\s*стр\.?\s*\d+/gi, '')
        .trim();

    // Убираем префиксы "ул.", "пр.", "пер." и т.д.
    const streetTypes = {
        'улица': 'ulica',
        'проспект': 'prospekt',
        'переулок': 'pereulok',
        'площадь': 'ploshchad',
        'бульвар': 'bulvar',
        'набережная': 'naberezhnaya',
        'шоссе': 'shosse',
        'проезд': 'proezd',
        'тупик': 'tupik',
        'аллея': 'alleya',
        'микрорайон': 'mikrorayon',
    };

    // Извлекаем только название улицы
    let cleaned = noHouse
        .replace(/^(ул\.?|пр\.?|пр-кт\.?|пер\.?|пл\.?|б-р\.?|бул\.?|наб\.?|ш\.?|мкр\.?)\s*/i, '')
        .trim();

    // Транслитерация (базовая)
    const translit = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
        'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
        'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
        'ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
    };

    // Находим тип улицы из оригинального адреса для добавления в конец
    let streetTypeSuffix = '';
    for (const [ru, en] of Object.entries(streetTypes)) {
        if (noHouse.toLowerCase().includes(ru) || address.toLowerCase().includes(ru.slice(0, 3))) {
            streetTypeSuffix = `-${en}`;
            break;
        }
    }
    // Дефолт — ulica
    if (!streetTypeSuffix) streetTypeSuffix = '-ulica';

    const slug = cleaned
        .toLowerCase()
        .split('')
        .map(c => translit[c] || (c.match(/[a-z0-9]/) ? c : '-'))
        .join('')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return slug + streetTypeSuffix;
}

/**
 * Возвращает URL страницы города на dom.mingkh.ru
 */
export function getMingkhCityUrl(city) {
    const slugs = CITY_SLUGS[city];
    if (!slugs) return `https://dom.mingkh.ru/`;
    return `https://dom.mingkh.ru/${slugs.region}/${slugs.city}/`;
}

/**
 * Возвращает URL поиска конкретного дома на dom.mingkh.ru
 */
export function getMingkhSearchUrl(address, city) {
    const slugs = CITY_SLUGS[city] || { region: '', city: city?.toLowerCase() || '' };
    const streetSlug = buildStreetSlug(address);
    if (slugs.region && streetSlug) {
        return `https://dom.mingkh.ru/${slugs.region}/${slugs.city}/${streetSlug}`;
    }
    // Fallback — поиск по сайту
    const q = encodeURIComponent(`${city} ${address}`);
    return `https://dom.mingkh.ru/search?q=${q}`;
}

// ─── Нормализация типа дома ───────────────────────────────────────────────────
const BUILDING_TYPE_MAP = {
    'панел':    'panel',
    'кирпич':   'brick',
    'монолит':  'monolith',
    'дерев':    'wood',
    'блок':     'block',
    'panel':    'panel',
    'brick':    'brick',
    'monolith': 'monolith',
    'wood':     'wood',
    'block':    'block',
};

function normalizeBuildingType(raw) {
    if (!raw || raw === 'null') return '';
    const lower = String(raw).toLowerCase();
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
 * Основная функция: запрашивает данные о доме через Gemini с прямым указанием
 * на страницу dom.mingkh.ru для конкретного города и улицы.
 */
export async function parseHouseFromAddress(address, city) {
    if (!ZHIPU_API_KEY) {
        throw new Error('Добавьте VITE_ZHIPU_API_KEY или VITE_GEMINI_API_KEY в файл .env и ПЕРЕЗАПУСТИТЕ проект (npm run dev)');
    }
    if (!address && !city) {
        throw new Error('Укажите адрес для поиска');
    }

    const slugs = CITY_SLUGS[city] || null;
    const streetSlug = buildStreetSlug(address);
    const mingkhUrl = slugs && streetSlug
        ? `https://dom.mingkh.ru/${slugs.region}/${slugs.city}/${streetSlug}`
        : null;

    const mingkhCityUrl = slugs
        ? `https://dom.mingkh.ru/${slugs.region}/${slugs.city}/`
        : null;

    // Извлекаем только улицу и номер дома из полного адреса
    const houseNum = (address || '').match(/[\d]+[а-яёА-ЯЁa-zA-Z]*(\/\d+)?/)?.[0] || '';
    const location = [address, city].filter(Boolean).join(', ');

    // Формируем очень конкретный промт с прямыми ссылками на dom.mingkh.ru
    const urlHints = [
        mingkhUrl    ? `- Страница улицы: ${mingkhUrl}` : null,
        mingkhCityUrl ? `- Страница города: ${mingkhCityUrl}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `Тебе нужно найти технические характеристики жилого дома по адресу: "${location}", Россия.

ВАЖНО: Используй ТОЛЬКО сайт dom.mingkh.ru (МинЖКХ).
${urlHints ? `\nПрямые ссылки для поиска:\n${urlHints}\n\nНайди на странице улицы дом ${houseNum || address} и перейди на его карточку.` : ''}

На карточке дома найди и верни следующие данные в формате JSON (null если не найдено):
{
  "year_built": число — год постройки,
  "floors_total": число — количество этажей,
  "building_type": "panel"/"brick"/"monolith"/"wood"/"block" — материал стен,
  "apartments_count": число — количество квартир,
  "has_elevator": true/false — есть ли лифт,
  "has_garbage_chute": true/false — есть ли мусоропровод,
  "ceiling_height": число в метрах — высота потолков,
  "series": строка — серия/тип дома,
  "developer": строка — застройщик (для новостроек),
  "management_company": строка — управляющая компания,
  "cadastral_number": строка — кадастровый номер,
  "source": "dom.mingkh.ru" и URL страницы дома
}

Верни ТОЛЬКО JSON, без markdown, без пояснений.`;

    const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ZHIPU_API_KEY}`
        },
        body: JSON.stringify({
            model: 'glm-4-flash',
            messages: [{ role: 'user', content: prompt }],
            tools: [{
                type: 'web_search',
                web_search: {
                    enable: true,
                    search_result: true
                }
            }],
            temperature: 0.05,
            max_tokens: 2000,
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
    const rawText = data?.choices?.[0]?.message?.content?.trim() || '';

    if (!rawText) {
        console.warn('[houseParser] Empty response from Zhipu. Full response:', JSON.stringify(data, null, 2));
        throw new Error('Zhipu AI вернул пустой ответ. Попробуйте ещё раз.');
    }

    // Strip markdown code fences if present
    const stripped = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();

    const firstBrace = stripped.indexOf('{');
    const lastBrace  = stripped.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        console.warn('[houseParser] No JSON object found. Raw text:', rawText.slice(0, 600));
        throw new Error('Не удалось распознать ответ. Попробуйте уточнить адрес.');
    }

    let parsed;
    try {
        parsed = JSON.parse(stripped.slice(firstBrace, lastBrace + 1));
    } catch {
        throw new Error('Ошибка разбора данных. Попробуйте ещё раз.');
    }

    return normalizeHouseData(parsed);
}

/** Нормализует сырой ответ Gemini в поля формы. */
function normalizeHouseData(raw) {
    const result = {
        build_year:         safeInt(raw.year_built),
        floors_total:       safeInt(raw.floors_total),
        building_type:      normalizeBuildingType(raw.building_type),
        apartments_count:   safeInt(raw.apartments_count),
        has_elevator:       raw.has_elevator === true  ? true  : raw.has_elevator === false ? false : null,
        has_garbage_chute:  raw.has_garbage_chute === true ? true : raw.has_garbage_chute === false ? false : null,
        ceiling_height:     safeFloat(raw.ceiling_height),
        house_series:       (raw.series && raw.series !== 'null') ? raw.series : null,
        developer:          (raw.developer && raw.developer !== 'null') ? raw.developer : null,
        management_company: (raw.management_company && raw.management_company !== 'null') ? raw.management_company : null,
        cadastral_number:   (raw.cadastral_number && raw.cadastral_number !== 'null') ? raw.cadastral_number : null,
        _source: raw.source || 'dom.mingkh.ru',
        _rawBuildingType: raw.building_type,
    };

    return Object.fromEntries(
        Object.entries(result).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );
}

/** Возвращает список найденных полей для отображения пользователю. */
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
