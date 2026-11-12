import { BUILDING_TYPES, PROPERTY_TYPES, BALCONY_LABELS, RENOVATION_LABELS, MARKET_LABELS } from '../data/constants.js';
import { parseHouseFromAddress } from './houseParser.js';
import { getToken } from '../lib/neon.js';

const TYPE_WORDS = {
    apartment: 'квартира',
    house: 'дом',
    land: 'земельный участок',
    garden: 'садовый участок',
    commercial: 'помещение',
    room: 'комната'
};

const BUILDING_ADJECTIVES = {
    panel: 'Панельный',
    brick: 'Кирпичный',
    monolith: 'Монолитный',
    wood: 'Деревянный',
    block: 'Блочный'
};

const OBJECT_BLOCK_HEADERS = {
    room: 'О комнате:',
    house: 'О доме (характеристики):',
    land: 'О земельном участке:',
    garden: 'О садовом участке:',
    commercial: 'О помещении:'
};

/**
 * Builds a fallback advertisement from the property card data when all AI
 * providers are unavailable. The structure mirrors the AI prompt so the result
 * is ready for publishing after a quick review.
 */
export function buildFallbackAd(property, includeContacts = false, currentUser = null) {
    const typeWord = TYPE_WORDS[property.property_type] || 'квартира';

    const titleParts = [];
    if (property.property_type === 'apartment' || property.property_type === 'room') {
        if (property.rooms === 0) titleParts.push('Студия');
        else if (property.rooms) titleParts.push(`${property.rooms}-комнатная ${typeWord}`);
        else titleParts.push(typeWord);
    } else {
        titleParts.push(typeWord);
    }
    if (property.area_total) titleParts.push(`${property.area_total} кв.м.`);

    const address = [property.city, property.address].filter(Boolean).join(', ');
    const title = `Продается ${titleParts.join(', ')}${address ? ` по адресу: ${address}` : ''}.`;

    const priceLine = property.price
        ? `Стоимость: ${Number(property.price).toLocaleString('ru-RU')} рублей.`
        : '';

    const houseParts = [];
    if (property.building_type && BUILDING_ADJECTIVES[property.building_type]) {
        houseParts.push(`${BUILDING_ADJECTIVES[property.building_type]} дом.`);
    }
    if (property.floors_total) houseParts.push(`Этажность: ${property.floors_total}.`);
    if (property.build_year) houseParts.push(`Год постройки: ${property.build_year}.`);
    if (property.house_series) houseParts.push(`Серия дома: ${property.house_series}.`);
    if (property.developer) houseParts.push(`Застройщик: ${property.developer}.`);
    if (property.management_company) houseParts.push(`Управляющая компания: ${property.management_company}.`);
    if (property.has_elevator !== undefined && property.has_elevator !== null) {
        houseParts.push(property.has_elevator ? 'Есть лифт.' : 'Лифта нет.');
    }
    if (property.has_garbage_chute !== undefined && property.has_garbage_chute !== null) {
        houseParts.push(property.has_garbage_chute ? 'Есть мусоропровод.' : 'Мусоропровода нет.');
    }
    const houseText = houseParts.length ? houseParts.join(' ') : 'Информация о доме уточняется.';

    const objectParts = [];
    if (property.rooms !== undefined) {
        objectParts.push(`Количество комнат: ${property.rooms === 0 ? 'студия' : property.rooms}.`);
    }
    if (property.area_total) objectParts.push(`Общая площадь: ${property.area_total} кв.м.`);
    if (property.area_living) objectParts.push(`Жилая площадь: ${property.area_living} кв.м.`);
    if (property.area_kitchen) objectParts.push(`Площадь кухни: ${property.area_kitchen} кв.м.`);
    if (property.floor) {
        objectParts.push(`Этаж: ${property.floor}${property.floors_total ? ` из ${property.floors_total}` : ''}.`);
    }
    if (property.ceiling_height) objectParts.push(`Высота потолков: ${property.ceiling_height} м.`);
    if (property.renovation && RENOVATION_LABELS[property.renovation]) {
        objectParts.push(`Ремонт: ${RENOVATION_LABELS[property.renovation].toLowerCase()}.`);
    }
    if (property.balcony && BALCONY_LABELS[property.balcony]) {
        objectParts.push(`Балкон/лоджия: ${BALCONY_LABELS[property.balcony].toLowerCase()}.`);
    }
    const objectText = objectParts.length ? objectParts.join(' ') : 'Характеристики объекта уточняются у риелтора.';

    const featuresText = property.notes
        ? property.notes
        : 'Показы проводятся по согласованию с риелтором.';
    const contactsText = includeContacts && currentUser
        ? [currentUser.full_name, currentUser.phone ? `телефон: ${currentUser.phone}` : '']
            .filter(Boolean)
            .join(', ')
        : '';

    const sections = [
        [title, priceLine].filter(Boolean).join('\n'),
        `О доме:\n${houseText}`,
        `${OBJECT_BLOCK_HEADERS[property.property_type] || 'О квартире:'}\n${objectText}`,
        'Инфраструктура:\nВ шаговой доступности магазины, школы, детские сады, медицинские учреждения и остановки общественного транспорта.',
        'Документы:\nДокументы подготовлены к сделке.',
        `Особенности:\n${featuresText}`
    ];

    let text = sections.join('\n\n');
    if (contactsText) text += `\n\n${contactsText}`;
    return text;
}

/**
 * Generates an advertisement text for a property using Zhipu/Gemini API.
 * Falls back to a data-driven template when all AI providers are unavailable.
 * 
 * @param {object} property - The property card details.
 * @param {string} _tone - Ignored, strictly using brief professional.
 * @param {boolean} includeContacts - Append agent name & phone.
 * @param {object} currentUser - The current user details.
 * @param {function} onStatusChange - Callback for status updates ('parsing' | 'generating').
 * @returns {Promise<{text: string, source: 'ai' | 'template'}>} The generated advertisement text.
 */
export async function generateAdFromAI(property, _tone = 'professional', includeContacts = false, currentUser = null, onStatusChange = null) {

    // 1. Try to parse live house data from dom.mingkh.ru / ГИС ЖКХ only if key parameters are missing
    let parsedHouseData = null;
    const hasKeyDetails = property.build_year && property.building_type;
    if (property.address && property.city && !hasKeyDetails) {
        if (onStatusChange) onStatusChange('parsing');
        try {
            console.log('[adGenerator] Attempting background house parsing...');
            parsedHouseData = await parseHouseFromAddress(property.address, property.city);
            console.log('[adGenerator] Background house parsing succeeded:', parsedHouseData);
        } catch (err) {
            console.warn('[adGenerator] Background house parsing failed:', err.message);
        }
    }

    if (onStatusChange) onStatusChange('generating');

    // Merge parsed details with existing property card
    const mergedProp = { ...property, ...parsedHouseData };

    const parts = [];
    const typeLabel = PROPERTY_TYPES[mergedProp.property_type] || mergedProp.property_type || 'Квартира';
    parts.push(`Тип объекта: ${typeLabel}`);

    if (mergedProp.price) {
        parts.push(`Стоимость: ${mergedProp.price.toLocaleString('ru-RU')} рублей`);
    }

    if (mergedProp.city || mergedProp.address) {
        parts.push(`Адрес: ${[mergedProp.city, mergedProp.address].filter(Boolean).join(', ')}`);
    }

    if (mergedProp.rooms !== undefined) {
        parts.push(`Количество комнат: ${mergedProp.rooms === 0 ? 'Студия' : mergedProp.rooms}`);
    }

    if (mergedProp.area_total) parts.push(`Общая площадь: ${mergedProp.area_total} кв.м.`);
    if (mergedProp.area_living) parts.push(`Жилая площадь: ${mergedProp.area_living} кв.м.`);
    if (mergedProp.area_kitchen) parts.push(`Площадь кухни: ${mergedProp.area_kitchen} кв.м.`);

    if (mergedProp.floor) {
        parts.push(`Этаж: ${mergedProp.floor} из ${mergedProp.floors_total || 'не указано'}`);
    } else if (mergedProp.floors_total) {
        parts.push(`Этажность дома: ${mergedProp.floors_total}`);
    }

    if (mergedProp.building_type && BUILDING_TYPES[mergedProp.building_type]) {
        parts.push(`Материал стен / тип дома: ${BUILDING_TYPES[mergedProp.building_type]}`);
    }

    if (mergedProp.balcony && BALCONY_LABELS[mergedProp.balcony]) {
        parts.push(`Балкон/лоджия: ${BALCONY_LABELS[mergedProp.balcony]}`);
    }

    if (mergedProp.renovation && RENOVATION_LABELS[mergedProp.renovation]) {
        parts.push(`Ремонт: ${RENOVATION_LABELS[mergedProp.renovation]}`);
    }

    if (mergedProp.market && MARKET_LABELS[mergedProp.market]) {
        parts.push(`Рынок: ${MARKET_LABELS[mergedProp.market]}`);
    }

    if (mergedProp.build_year) {
        parts.push(`Год постройки: ${mergedProp.build_year}`);
    }

    if (mergedProp.house_series) {
        parts.push(`Серия дома: ${mergedProp.house_series}`);
    }

    if (mergedProp.developer) {
        parts.push(`Застройщик: ${mergedProp.developer}`);
    }

    if (mergedProp.management_company) {
        parts.push(`Управляющая компания: ${mergedProp.management_company}`);
    }

    if (mergedProp.cadastral_number) {
        parts.push(`Кадастровый номер: ${mergedProp.cadastral_number}`);
    }

    if (mergedProp.has_elevator !== undefined && mergedProp.has_elevator !== null) {
        parts.push(`Наличие лифта: ${mergedProp.has_elevator ? 'Есть' : 'Нет'}`);
    }

    if (mergedProp.has_garbage_chute !== undefined && mergedProp.has_garbage_chute !== null) {
        parts.push(`Наличие мусоропровода: ${mergedProp.has_garbage_chute ? 'Есть' : 'Нет'}`);
    }

    if (mergedProp.ceiling_height) {
        parts.push(`Высота потолков: ${mergedProp.ceiling_height} м`);
    }

    if (mergedProp.notes) {
        parts.push(`Дополнительные примечания риелтора/описание: ${mergedProp.notes}`);
    }

    let contactsPrompt = '';
    if (includeContacts && currentUser) {
        contactsPrompt = `В самом конце объявления добавь контактные данные риелтора: ${currentUser.full_name || ''} ${currentUser.phone ? `, телефон: ${currentUser.phone}` : ''}.`;
    }

    // Determine target block label for the object
    let objectBlockHeader = 'О квартире:';
    if (mergedProp.property_type === 'room') objectBlockHeader = 'О комнате:';
    else if (mergedProp.property_type === 'house') objectBlockHeader = 'О доме (характеристики):';
    else if (mergedProp.property_type === 'land') objectBlockHeader = 'О земельном участке:';
    else if (mergedProp.property_type === 'garden') objectBlockHeader = 'О садовом участке:';
    else if (mergedProp.property_type === 'commercial') objectBlockHeader = 'О помещении:';

    const prompt = `Напиши краткое и строго профессиональное объявление о продаже недвижимости для размещения на классифайдах (например, Авито, Циан) на русском языке.

Характеристики объекта:
${parts.map(p => `- ${p}`).join('\n')}

Стиль текста:
- Строго деловой, краткий, лаконичный. Без преувеличений и "воды".

Формат и структура текста:
Объявление должно состоять из заголовка в начале, за которым следуют 5 обязательных блоков. Выдавай результат строго по следующим блокам:
1. Заголовок (например: Продается ${typeLabel.toLowerCase()} по адресу...)
2. О доме: (опиши дом: материал стен, этажность, лифт, год постройки, серия, застройщик, управляющая компания, основываясь на характеристиках. Высоту потолков сюда НЕ пиши).
3. ${objectBlockHeader} (опиши площадь, количество комнат, высоту потолков, планировку, этаж, ремонт, мебель, балкон и особенности объекта)
4. Инфраструктура: (опиши доступность магазинов, детских садов, школ, больниц, остановок транспорта и парков. Если информации нет в описании риелтора, сделай краткое логическое предположение на основе расположения объекта)
5. Документы: (опиши готовность к сделке, количество собственников, обременения, если указано. Если информации нет, напиши стандартную деловую фразу о готовности документов к сделке)
6. Особенности: (опиши плюсы, такие как вид во двор/парк, парковка, тихие соседи или другие преимущества)

${contactsPrompt}

КРИТИЧЕСКИЕ ТРЕБОВАНИЯ:
- НЕ используй смайлики (эмодзи) вообще.
- НЕ используй звездочки '*' (не пиши списки со звездочками, не пиши жирным шрифтом **текст** или курсивом *текст*). Название заголовка блока пиши просто текстом (например, О доме:, Документы:).
- Текст должен быть готов к публикации, без каких-либо вводных фраз от тебя (например, без "Вот ваше объявление:").`;

    const isCapacitor = typeof window !== 'undefined' && (window.Capacitor || window.location.href.startsWith('file:') || window.location.hostname === '');
    const proxyUrl = isCapacitor ? `https://reacrm.ru/api/ai-proxy` : `/api/ai-proxy`;

    try {
        const token = getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                action: 'generateAd',
                prompt
            })
        });

        if (!response.ok) {
            let errorMsg = `Ошибка AI прокси (${response.status})`;
            try {
                const errData = await response.json();
                if (errData?.error) {
                    errorMsg = errData.error;
                }
            } catch {
                try {
                    const errText = await response.text();
                    if (errText) errorMsg += `: ${errText}`;
                } catch (readErr) {
                    console.warn('[adGenerator] Failed to read error response body:', readErr?.message);
                }
            }
            const error = new Error(errorMsg);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();
        const text = data.text || '';
        if (!text) {
            return { text: buildFallbackAd(mergedProp, includeContacts, currentUser), source: 'template' };
        }
        return { text, source: 'ai' };
    } catch (err) {
        console.error('[adGenerator] Proxy error:', err.message);
        // Auth/session problems must be surfaced to the user, not hidden by a template.
        if (err.status === 401 || err.status === 403) throw err;
        console.warn('[adGenerator] AI providers unavailable, using template fallback');
        return { text: buildFallbackAd(mergedProp, includeContacts, currentUser), source: 'template' };
    }
}
