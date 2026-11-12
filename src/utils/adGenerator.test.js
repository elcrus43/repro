import { describe, it, expect } from 'vitest';
import { buildFallbackAd } from './adGenerator.js';

describe('buildFallbackAd', () => {
    it('builds a full ad from property data', () => {
        const text = buildFallbackAd({
            property_type: 'apartment',
            rooms: 2,
            area_total: 54.5,
            area_living: 30,
            area_kitchen: 9,
            floor: 5,
            floors_total: 9,
            price: 6500000,
            city: 'Москва',
            address: 'ул. Ленина, д. 5',
            building_type: 'panel',
            build_year: 1998,
            renovation: 'euro',
            balcony: 'loggia',
            has_elevator: true,
            has_garbage_chute: false,
        }, true, { full_name: 'Иван Петров', phone: '+7 900 000-00-00' });

        const normalized = text.replace(/\u00A0/g, ' ');

        expect(normalized).toContain('Продается 2-комнатная квартира, 54.5 кв.м. по адресу: Москва, ул. Ленина, д. 5.');
        expect(normalized).toContain('Стоимость: 6 500 000 рублей.');
        expect(normalized).toContain('О доме:');
        expect(normalized).toContain('Панельный дом.');
        expect(normalized).toContain('О квартире:');
        expect(normalized).toContain('Этаж: 5 из 9.');
        expect(normalized).toContain('Ремонт: евро.');
        expect(normalized).toContain('Особенности:');
        expect(normalized).toContain('Иван Петров, телефон: +7 900 000-00-00');
        expect(text).not.toMatch(/[*—]/);
    });

    it('handles a studio without address', () => {
        const text = buildFallbackAd({ property_type: 'apartment', rooms: 0 });
        expect(text).toContain('Продается Студия.');
        expect(text).toContain('Информация о доме уточняется.');
    });
});
