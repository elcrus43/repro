/**
 * src/utils/dealDocuments.js — чек-лист документов по сделке.
 *
 * Чистый модуль без обращения к React/БД:
 *  - описывает чек-листы для купли-продажи и аренды;
 *  - нормализует JSONB-поле deals.documents;
 *  - меняет статусы, фиксирует сгенерированные файлы, считает прогресс.
 *
 * Формат записи в deals.documents (JSONB-массив):
 * {
 *   key: 'sale_contract',        // id пункта чек-листа
 *   label: 'Договор купли-продажи',
 *   templateKey: 'sale',         // ключ шаблона DocumentsPage или null
 *   status: 'pending'|'ready'|'signed',
 *   fileName: 'Договор купли-продажи.docx',
 *   updatedAt: '2026-01-01T00:00:00.000Z'
 * }
 */

export const DEAL_DOC_STATUSES = ['pending', 'ready', 'signed'];

export const DEAL_DOC_STATUS_META = {
    pending: { label: 'Не готов', color: '#64748b', bg: 'rgba(100,116,139,0.10)' },
    ready: { label: 'Готов', color: '#2563eb', bg: 'rgba(37,99,235,0.10)' },
    signed: { label: 'Подписан', color: '#059669', bg: 'rgba(5,150,105,0.12)' },
};

/** Общие пункты, встречающиеся в обоих типах сделок. */
const COMMON_DOCUMENTS = {
    act: { key: 'act', label: 'Акт приёма-передачи', templateKey: 'act' },
    keys_act: { key: 'keys_act', label: 'Акт приёма-передачи ключей', templateKey: 'key_act' },
    spouse_consent: { key: 'spouse_consent', label: 'Согласие супруга(и)', templateKey: null },
    payment_details: { key: 'payment_details', label: 'Реквизиты для расчётов', templateKey: null },
};

export const SALE_CHECKLIST = [
    { key: 'sale_contract', label: 'Договор купли-продажи', templateKey: 'sale' },
    COMMON_DOCUMENTS.act,
    COMMON_DOCUMENTS.keys_act,
    { key: 'agency_seller', label: 'Агентский договор (продавец)', templateKey: 'agency_sale_1' },
    { key: 'agency_buyer', label: 'Агентский договор (покупатель)', templateKey: 'yuss_buy_1' },
    { key: 'egrn', label: 'Выписка ЕГРН', templateKey: null },
    COMMON_DOCUMENTS.spouse_consent,
    { key: 'registered_persons', label: 'Справка о зарегистрированных лицах', templateKey: null },
    COMMON_DOCUMENTS.payment_details,
];

export const RENT_CHECKLIST = [
    { key: 'rent_contract', label: 'Договор аренды', templateKey: 'rent' },
    COMMON_DOCUMENTS.act,
    COMMON_DOCUMENTS.keys_act,
    { key: 'agency_landlord', label: 'Агентский договор (наймодатель)', templateKey: 'agency_rent_landlord_1' },
    { key: 'services_3party', label: 'Договор оказания услуг (3-сторонний)', templateKey: 'services_rent_3party' },
    { key: 'owner_docs', label: 'Документы собственника (ЕГРН/право)', templateKey: null },
    COMMON_DOCUMENTS.spouse_consent,
    COMMON_DOCUMENTS.payment_details,
];

/** Все пункты обоих чек-листов — для восстановления подписи по key. */
const ALL_CHECKLIST_ITEMS = [...SALE_CHECKLIST, ...RENT_CHECKLIST].reduce((acc, item) => {
    if (!acc[item.key]) acc[item.key] = item;
    return acc;
}, {});

/**
 * Определяет тип сделки: 'sale' | 'rent'.
 * Приоритет: deal.deal_type → тип объекта → эвристика по названию сделки.
 *
 * @param {object} [deal]
 * @param {object} [property]
 * @returns {'sale'|'rent'}
 */
export function getDealKind(deal, property) {
    const raw = deal?.deal_type || property?.deal_type || property?.dealType || '';
    const value = String(raw).toLowerCase().trim();
    if (value) {
        if (['rent', 'hire', 'аренда', 'найм'].includes(value)) return 'rent';
        return 'sale';
    }
    const title = String(deal?.title || '').toLowerCase();
    if (title.includes('аренд') || title.includes('найм')) return 'rent';
    return 'sale';
}

/**
 * @param {'sale'|'rent'} kind
 * @returns {Array<{key:string,label:string,templateKey:string|null}>}
 */
export function getDealChecklist(kind) {
    return kind === 'rent' ? RENT_CHECKLIST : SALE_CHECKLIST;
}

function normalizeStatus(status, fallback = 'pending') {
    return DEAL_DOC_STATUSES.includes(status) ? status : fallback;
}

function normalizeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const key = typeof raw.key === 'string' ? raw.key.trim() : '';
    if (!key) return null;

    const meta = ALL_CHECKLIST_ITEMS[key] || {};
    return {
        key,
        label: raw.label ? String(raw.label) : (meta.label || key),
        templateKey: raw.templateKey !== undefined ? raw.templateKey : (meta.templateKey || null),
        status: normalizeStatus(raw.status),
        fileName: raw.fileName ? String(raw.fileName) : null,
        updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
    };
}

/**
 * Нормализует значение deals.documents (может прийти JSON-строкой, null, массивом).
 * Дубли по key схлопываются (побеждает последняя запись).
 *
 * @param {unknown} raw
 * @returns {Array<object>}
 */
export function normalizeDealDocuments(raw) {
    let list = raw;
    if (typeof list === 'string') {
        try {
            list = JSON.parse(list);
        } catch {
            return [];
        }
    }
    if (!Array.isArray(list)) return [];

    const byKey = new Map();
    list.forEach(entry => {
        const normalized = normalizeEntry(entry);
        if (normalized) byKey.set(normalized.key, normalized);
    });
    return Array.from(byKey.values());
}

/**
 * Находит запись документа по ключу пункта чек-листа.
 */
export function getDealDocumentEntry(documents, key) {
    return normalizeDealDocuments(documents).find(doc => doc.key === key) || null;
}

/**
 * Обновляет/добавляет запись документа, не теряя остальные.
 *
 * @param {unknown} documents
 * @param {string} key
 * @param {object} patch
 * @returns {Array<object>}
 */
export function upsertDealDocument(documents, key, patch = {}) {
    const current = normalizeDealDocuments(documents);
    const index = current.findIndex(doc => doc.key === key);
    const base = index >= 0 ? current[index] : (ALL_CHECKLIST_ITEMS[key] || { key });
    const next = normalizeEntry({
        ...base,
        ...patch,
        key,
        updatedAt: patch.updatedAt || new Date().toISOString(),
    });
    if (!next) return current;

    if (index >= 0) current[index] = next;
    else current.push(next);
    return current;
}

/**
 * Меняет статус пункта. Статус 'pending' сбрасывает запись (пункт снова «не готов»).
 *
 * @param {unknown} documents
 * @param {string} key
 * @param {'pending'|'ready'|'signed'} status
 * @returns {Array<object>}
 */
export function setDealDocumentStatus(documents, key, status) {
    const normalized = normalizeDealDocuments(documents);
    if (status === 'pending') {
        return normalized.filter(doc => doc.key !== key);
    }
    return upsertDealDocument(normalized, key, { status: normalizeStatus(status) });
}

/**
 * Удаляет документ из сделки полностью (пункт чек-листа вернётся в «не готов»).
 */
export function removeDealDocument(documents, key) {
    return normalizeDealDocuments(documents).filter(doc => doc.key !== key);
}

/**
 * Фиксирует сгенерированный файл в сделке.
 *
 * @param {unknown} documents
 * @param {{key:string, fileName?:string|null, templateKey?:string|null, status?:string, label?:string}} doc
 * @returns {Array<object>}
 */
export function recordDealDocument(documents, doc = {}) {
    if (!doc.key) return normalizeDealDocuments(documents);
    return upsertDealDocument(documents, doc.key, {
        label: doc.label,
        templateKey: doc.templateKey,
        fileName: doc.fileName || null,
        status: normalizeStatus(doc.status, 'ready'),
    });
}

/**
 * Следующий статус при клике по статусу: ready → signed → pending → ready.
 */
export function nextDealDocumentStatus(status) {
    if (status === 'ready') return 'signed';
    if (status === 'signed') return 'pending';
    return 'ready';
}

/**
 * Прогресс по чек-листу: сколько пунктов готово/подписано.
 *
 * @param {unknown} documents
 * @param {'sale'|'rent'} kind
 * @param {Array<{key:string}>} [checklist]
 * @returns {{total:number, done:number, signed:number, pending:number, percent:number, nextKey:string|null}}
 */
export function dealDocumentsProgress(documents, kind, checklist) {
    const list = checklist || getDealChecklist(kind);
    const map = new Map(normalizeDealDocuments(documents).map(doc => [doc.key, doc]));

    let done = 0;
    let signed = 0;
    let nextKey = null;

    list.forEach(item => {
        const entry = map.get(item.key);
        const status = entry?.status || 'pending';
        if (status === 'ready' || status === 'signed') done += 1;
        if (status === 'signed') signed += 1;
        if (!nextKey && status === 'pending') nextKey = item.key;
    });

    const total = list.length;
    return {
        total,
        done,
        signed,
        pending: total - done,
        percent: total ? Math.round((done / total) * 100) : 0,
        nextKey,
    };
}
