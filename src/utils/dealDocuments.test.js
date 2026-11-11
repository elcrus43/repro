import { describe, it, expect } from 'vitest';
import {
    SALE_CHECKLIST,
    RENT_CHECKLIST,
    getDealKind,
    getDealChecklist,
    normalizeDealDocuments,
    getDealDocumentEntry,
    setDealDocumentStatus,
    removeDealDocument,
    recordDealDocument,
    nextDealDocumentStatus,
    dealDocumentsProgress,
} from './dealDocuments';

describe('getDealKind', () => {
    it('определяет аренду по объекту', () => {
        expect(getDealKind({}, { deal_type: 'rent' })).toBe('rent');
        expect(getDealKind({}, { deal_type: 'аренда' })).toBe('rent');
    });

    it('по умолчанию считает сделку куплей-продажей', () => {
        expect(getDealKind({}, {})).toBe('sale');
        expect(getDealKind({ title: 'Продажа 2-к квартиры' }, null)).toBe('sale');
    });

    it('распознаёт аренду по названию сделки', () => {
        expect(getDealKind({ title: 'Найм квартиры на Ленина' })).toBe('rent');
    });

    it('приоритет у deal.deal_type', () => {
        expect(getDealKind({ deal_type: 'sale' }, { deal_type: 'rent' })).toBe('sale');
    });
});

describe('getDealChecklist', () => {
    it('возвращает чек-лист купли-продажи', () => {
        expect(getDealChecklist('sale')).toBe(SALE_CHECKLIST);
        expect(SALE_CHECKLIST.some(i => i.templateKey === 'sale')).toBe(true);
    });

    it('возвращает чек-лист аренды', () => {
        expect(getDealChecklist('rent')).toBe(RENT_CHECKLIST);
        expect(RENT_CHECKLIST.some(i => i.templateKey === 'rent')).toBe(true);
    });

    it('все templateKey существуют в генераторе документов', () => {
        const valid = ['yuss_buy_1', 'agency_sale_1', 'agency_rent_landlord_1', 'services_rent_3party', 'sale', 'rent', 'act', 'key_act'];
        [...SALE_CHECKLIST, ...RENT_CHECKLIST].forEach(item => {
            if (item.templateKey) expect(valid).toContain(item.templateKey);
        });
    });
});

describe('normalizeDealDocuments', () => {
    it('возвращает пустой массив для null/мусора', () => {
        expect(normalizeDealDocuments(null)).toEqual([]);
        expect(normalizeDealDocuments(undefined)).toEqual([]);
        expect(normalizeDealDocuments('not json')).toEqual([]);
        expect(normalizeDealDocuments({})).toEqual([]);
    });

    it('парсит JSON-строку из БД', () => {
        const docs = normalizeDealDocuments('[{"key":"sale_contract","status":"signed"}]');
        expect(docs).toHaveLength(1);
        expect(docs[0].key).toBe('sale_contract');
        expect(docs[0].label).toBe('Договор купли-продажи');
        expect(docs[0].status).toBe('signed');
    });

    it('схлопывает дубли и чинит неизвестный статус', () => {
        const docs = normalizeDealDocuments([
            { key: 'act', status: 'weird' },
            { key: 'act', status: 'ready' },
            { key: '' },
            null,
        ]);
        expect(docs).toHaveLength(1);
        expect(docs[0].status).toBe('ready');
    });
});

describe('setDealDocumentStatus', () => {
    it('добавляет запись с нужным статусом', () => {
        const docs = setDealDocumentStatus([], 'act', 'signed');
        expect(docs).toHaveLength(1);
        expect(docs[0]).toMatchObject({ key: 'act', status: 'signed', label: 'Акт приёма-передачи' });
        expect(docs[0].updatedAt).toBeTruthy();
    });

    it('меняет статус существующей записи', () => {
        const docs = setDealDocumentStatus([{ key: 'act', status: 'ready' }], 'act', 'signed');
        expect(docs[0].status).toBe('signed');
    });

    it('pending сбрасывает запись', () => {
        expect(setDealDocumentStatus([{ key: 'act', status: 'signed' }], 'act', 'pending')).toEqual([]);
    });
});

describe('recordDealDocument / removeDealDocument', () => {
    it('фиксирует файл со статусом ready по умолчанию', () => {
        const docs = recordDealDocument([], {
            key: 'sale_contract',
            fileName: 'Договор купли-продажи.docx',
            templateKey: 'sale',
        });
        expect(docs[0]).toMatchObject({
            key: 'sale_contract',
            status: 'ready',
            fileName: 'Договор купли-продажи.docx',
            templateKey: 'sale',
        });
    });

    it('не дублирует запись при повторной фиксации', () => {
        let docs = recordDealDocument([], { key: 'act', fileName: 'a.docx' });
        docs = recordDealDocument(docs, { key: 'act', fileName: 'b.docx' });
        expect(docs).toHaveLength(1);
        expect(docs[0].fileName).toBe('b.docx');
    });

    it('удаляет запись', () => {
        expect(removeDealDocument([{ key: 'act' }], 'act')).toEqual([]);
    });
});

describe('nextDealDocumentStatus', () => {
    it('циклически переключает статусы', () => {
        expect(nextDealDocumentStatus('pending')).toBe('ready');
        expect(nextDealDocumentStatus('ready')).toBe('signed');
        expect(nextDealDocumentStatus('signed')).toBe('pending');
    });
});

describe('dealDocumentsProgress', () => {
    it('считает прогресс по чек-листу', () => {
        const docs = [
            { key: 'sale_contract', status: 'signed' },
            { key: 'act', status: 'ready' },
        ];
        const progress = dealDocumentsProgress(docs, 'sale');
        expect(progress.total).toBe(SALE_CHECKLIST.length);
        expect(progress.done).toBe(2);
        expect(progress.signed).toBe(1);
        expect(progress.percent).toBe(Math.round((2 / SALE_CHECKLIST.length) * 100));
        expect(progress.nextKey).toBe('keys_act');
    });

    it('игнорирует записи, которых нет в чек-листе', () => {
        const progress = dealDocumentsProgress([{ key: 'unknown', status: 'signed' }], 'rent');
        expect(progress.done).toBe(0);
    });

    it('для пустого списка возвращает 0%', () => {
        const progress = dealDocumentsProgress([], 'rent');
        expect(progress.percent).toBe(0);
        expect(progress.total).toBe(RENT_CHECKLIST.length);
    });
});

describe('getDealDocumentEntry', () => {
    it('находит запись по ключу', () => {
        expect(getDealDocumentEntry([{ key: 'act', status: 'ready' }], 'act').status).toBe('ready');
        expect(getDealDocumentEntry([], 'act')).toBeNull();
    });
});
