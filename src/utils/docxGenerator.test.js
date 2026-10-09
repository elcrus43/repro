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
        expect(templates.length).toBeGreaterThanOrEqual(1);
        expect(templates[0].key).toBe('yuss_buy_1');
        expect(templates[0].title).toBe('ЮСС Покупка (1 принципал)');
    });
});

import { toShortName } from './docxGenerator';

describe('docxGenerator - toShortName', () => {
    it('formats full Russian names into initials correctly', () => {
        expect(toShortName('Иванов Иван Иванович')).toBe('Иванов И.И.');
        expect(toShortName('Петров Сергей')).toBe('Петров С.');
        expect(toShortName('Сидоров')).toBe('Сидоров');
        expect(toShortName('')).toBe('____________________');
    });
});
