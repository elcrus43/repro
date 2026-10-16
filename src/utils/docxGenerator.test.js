import { describe, it, expect } from 'vitest';
import { numberToWordsRu, getDocumentTemplates } from './docxGenerator';

describe('docxGenerator - numberToWordsRu', () => {
    it('correctly converts small numbers', () => {
        expect(numberToWordsRu(0)).toBe('ноль');
        expect(numberToWordsRu(5)).toBe('пять');
        expect(numberToWordsRu(15)).toBe('пятнадцать');
        expect(numberToWordsRu(21)).toBe('двадцать один');
    });

    it('correctly converts thousands with correct gender and forms', () => {
        expect(numberToWordsRu(1000)).toBe('одна тысяча');
        expect(numberToWordsRu(2000)).toBe('две тысячи');
        expect(numberToWordsRu(5000)).toBe('пять тысяч');
        expect(numberToWordsRu(21000)).toBe('двадцать одна тысяча');
        expect(numberToWordsRu(50000)).toBe('пятьдесят тысяч');
        expect(numberToWordsRu(125000)).toBe('сто двадцать пять тысяч');
    });

    it('correctly converts millions', () => {
        expect(numberToWordsRu(1000000)).toBe('один миллион');
        expect(numberToWordsRu(2350000)).toBe('два миллиона триста пятьдесят тысяч');
    });
});

describe('docxGenerator - getDocumentTemplates', () => {
    it('includes yuss_buy_1 as the first template', () => {
        const templates = getDocumentTemplates();
        expect(templates.length).toBeGreaterThanOrEqual(2);
        expect(templates[0].key).toBe('yuss_buy_1');
        expect(templates[0].title).toBe('ЮСС Покупка (1 принципал)');
    });

    it('includes agency_sale_1 template', () => {
        const templates = getDocumentTemplates();
        const saleTpl = templates.find(t => t.key === 'agency_sale_1');
        expect(saleTpl).toBeDefined();
        expect(saleTpl.title).toBe('Агентский договор — Продажа (1 принципал)');
    });

    it('includes agency_rent_landlord_1 template', () => {
        const templates = getDocumentTemplates();
        const rentTpl = templates.find(t => t.key === 'agency_rent_landlord_1');
        expect(rentTpl).toBeDefined();
        expect(rentTpl.title).toBe('АД Найм с наймодателем');
    });
});

import { toShortName, formatPropertyKind, collectDocxBlocksFromDom } from './docxGenerator';

describe('docxGenerator - toShortName', () => {
    it('formats full Russian names into initials correctly', () => {
        expect(toShortName('Иванов Иван Иванович')).toBe('Иванов И.И.');
        expect(toShortName('Петров Сергей')).toBe('Петров С.');
        expect(toShortName('Сидоров')).toBe('Сидоров');
        expect(toShortName('')).toBe('____________________');
    });
});

describe('docxGenerator - formatPropertyKind', () => {
    it('returns correct property kind for apartments with rooms', () => {
        expect(formatPropertyKind({ property_type: 'apartment', rooms: 2 })).toBe('2-комн. квартира');
        expect(formatPropertyKind({ property_type: 'apartment', rooms: 1 })).toBe('1-комн. квартира');
        expect(formatPropertyKind({ property_type: 'apartment', rooms: '3' })).toBe('3-комн. квартира');
        expect(formatPropertyKind({ property_type: 'apartment', rooms: 'studio' })).toBe('Квартира-студия');
        expect(formatPropertyKind({ property_type: 'apartment' })).toBe('Квартира');
        expect(formatPropertyKind(null)).toBe('Квартира');
    });

    it('returns correct property kind for other types', () => {
        expect(formatPropertyKind({ property_type: 'room' })).toBe('Комната');
        expect(formatPropertyKind({ property_type: 'house' })).toBe('Жилой дом');
        expect(formatPropertyKind({ property_type: 'house', land_area: 10 })).toBe('Жилой дом с земельным участком');
        expect(formatPropertyKind({ property_type: 'land' })).toBe('Земельный участок');
        expect(formatPropertyKind({ property_type: 'garden' })).toBe('Земельный участок');
        expect(formatPropertyKind({ property_type: 'commercial' })).toBe('Нежилое помещение');
        expect(formatPropertyKind({ property_type: 'garage' })).toBe('Гараж');
    });

    it('respects custom property_kind if provided', () => {
        expect(formatPropertyKind({ property_kind: 'Таунхаус' })).toBe('Таунхаус');
        expect(formatPropertyKind({ property_kind: '2-комн. квартира (евродвушка)' })).toBe('2-комн. квартира (евродвушка)');
    });
});

describe('docxGenerator - collectDocxBlocksFromDom', () => {
    it('converts DOM paragraphs and spans into docx blocks', () => {
        const container = document.createElement('div');
        container.innerHTML = `
            <p><strong>Заголовок</strong></p>
            <p>Обычный текст с <em>курсивом</em> и <u>подчеркиванием</u>.</p>
        `;
        const blocks = collectDocxBlocksFromDom(container, false);
        expect(blocks.length).toBeGreaterThanOrEqual(2);
    });

    it('handles tables inside DOM correctly', () => {
        const container = document.createElement('div');
        container.innerHTML = `
            <table>
                <tbody>
                    <tr>
                        <td>Колонка 1</td>
                        <td>Колонка 2</td>
                    </tr>
                </tbody>
            </table>
        `;
        const blocks = collectDocxBlocksFromDom(container, false);
        expect(blocks.length).toBe(1);
    });
});

