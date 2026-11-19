/**
 * Утилиты интеграции со справочниками DaData (КЛАДР, ФИАС, ФМС, банки).
 * Вся работа с подсказками DaData стандартизирована здесь.
 */

const DADATA_SUGGEST_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs';

export function getDadataToken() {
    return import.meta.env?.VITE_DADATA_TOKEN || '';
}

/**
 * Нормализует 6-значный код подразделения паспорта (например: '430-001' или '430001' -> '430-001').
 * Возвращает пустую строку, если введено не 6 цифр.
 */
export function normalizeFmsCode(rawCode) {
    const digits = String(rawCode || '').replace(/\D/g, '').slice(0, 6);
    if (digits.length !== 6) return '';
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}`;
}

/**
 * Запрашивает подразделения ФМС/МВД по 6-значному коду подразделения.
 *
 * @param {string} rawCode - код подразделения (например, '430-001' или '430001')
 * @param {Object} [options]
 * @param {number} [options.count=5] - количество вариантов
 * @param {string} [options.token] - переопределение токена (для тестов)
 * @returns {Promise<Array<{ value: string, code: string, name: string, regionCode?: string }>>}
 */
export async function fetchFmsUnitByCode(rawCode, options = {}) {
    const formattedCode = normalizeFmsCode(rawCode);
    if (!formattedCode) return [];

    const token = options.token !== undefined ? options.token : getDadataToken();
    if (!token) {
        console.warn('[dadata] VITE_DADATA_TOKEN не задан, поиск подразделения пропущен');
        return [];
    }

    try {
        const count = options.count || 5;
        const res = await fetch(`${DADATA_SUGGEST_URL}/suggest/fms_unit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Token ${token}`,
            },
            body: JSON.stringify({ query: formattedCode, count }),
        });

        if (!res.ok) {
            console.warn(`[dadata] Ошибка ответа fms_unit: ${res.status}`);
            return [];
        }

        const json = await res.json();
        const rawList = Array.isArray(json?.suggestions) ? json.suggestions : [];

        return rawList.map(s => ({
            value: (s.value || '').trim(),
            code: s.data?.code || formattedCode,
            name: (s.data?.name || s.value || '').trim(),
            regionCode: s.data?.region_code || '',
            type: s.data?.type || '',
            raw: s,
        })).filter(item => Boolean(item.value));
    } catch (err) {
        console.warn('[dadata] Сбой запроса fms_unit:', err?.message || err);
        return [];
    }
}

/**
 * Поиск подразделения ФМС/МВД по произвольному тексту (наименование или часть кода).
 *
 * @param {string} textQuery
 * @param {Object} [options]
 * @returns {Promise<Array<{ value: string, code: string, name: string }>>}
 */
export async function suggestFmsUnits(textQuery, options = {}) {
    const query = String(textQuery || '').trim();
    if (query.length < 3) return [];

    const token = options.token !== undefined ? options.token : getDadataToken();
    if (!token) return [];

    try {
        const count = options.count || 5;
        const res = await fetch(`${DADATA_SUGGEST_URL}/suggest/fms_unit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Token ${token}`,
            },
            body: JSON.stringify({ query, count }),
        });

        if (!res.ok) return [];
        const json = await res.json();
        const rawList = Array.isArray(json?.suggestions) ? json.suggestions : [];

        return rawList.map(s => ({
            value: (s.value || '').trim(),
            code: s.data?.code || '',
            name: (s.data?.name || s.value || '').trim(),
            regionCode: s.data?.region_code || '',
            type: s.data?.type || '',
            raw: s,
        })).filter(item => Boolean(item.value));
    } catch {
        return [];
    }
}
