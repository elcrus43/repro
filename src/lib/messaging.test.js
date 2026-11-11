import { describe, it, expect } from 'vitest';
import { renderMessageLocally, buildMessageLinks } from './messaging';

describe('renderMessageLocally', () => {
    it('подставляет переменные контекста', () => {
        const text = renderMessageLocally('Здравствуйте, {{client_name}}! {{property_address}}', {
            client_name: 'Иван',
            property_address: 'ул. Ленина, 1',
        });
        expect(text).toBe('Здравствуйте, Иван! ул. Ленина, 1');
    });

    it('поддерживает пробелы внутри плейсхолдера', () => {
        expect(renderMessageLocally('{{  client_name }}', { client_name: 'Анна' })).toBe('Анна');
    });

    it('заменяет отсутствующие значения пустой строкой', () => {
        expect(renderMessageLocally('Телефон: {{phone}}', {})).toBe('Телефон: ');
    });

    it('не падает на null', () => {
        expect(renderMessageLocally(null, {})).toBe('');
    });
});

describe('buildMessageLinks', () => {
    it('нормализует номер с 8 на 7', () => {
        const { whatsapp } = buildMessageLinks('Привет', { phone: '8 (912) 345-67-89' });
        expect(whatsapp).toContain('https://wa.me/79123456789');
        expect(whatsapp).toContain(encodeURIComponent('Привет'));
    });

    it('нормализует 10-значный номер', () => {
        const { whatsapp } = buildMessageLinks('Привет', { phone: '9123456789' });
        expect(whatsapp).toContain('https://wa.me/79123456789');
    });

    it('без номера формирует ссылку без получателя', () => {
        const { whatsapp } = buildMessageLinks('Привет', {});
        expect(whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent('Привет')}`);
    });

    it('формирует telegram-ссылку со ссылкой на объект', () => {
        const { telegram } = buildMessageLinks('Смотрите', { property_link: 'https://reacrm.ru/p/1' });
        expect(telegram).toContain(`url=${encodeURIComponent('https://reacrm.ru/p/1')}`);
        expect(telegram).toContain(`text=${encodeURIComponent('Смотрите')}`);
    });

    it('возвращает исходный текст', () => {
        expect(buildMessageLinks('Текст', {}).text).toBe('Текст');
    });
});
