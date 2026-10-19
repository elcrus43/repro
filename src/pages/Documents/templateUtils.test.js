import { describe, it, expect } from 'vitest';
import { buildSlotValues, injectDataIntoTemplateHtml, sanitizeTemplateForSaving, toShortName } from './templateUtils';

describe('templateUtils - toShortName', () => {
    it('formats Russian names to initials', () => {
        expect(toShortName('Иванов Иван Иванович')).toBe('Иванов И.И.');
        expect(toShortName('Сидоров')).toBe('Сидоров');
        expect(toShortName('')).toBe('____________________');
    });
});

describe('templateUtils - buildSlotValues', () => {
    it('builds slot dictionary for agency contract', () => {
        const data = {
            seller: {
                full_name: 'Петров Петр Петрович',
                phone: '+7 999 111-22-33',
                birth_date: '1990-05-15',
                passport_details: {
                    series: '33 14',
                    number: '654321',
                    issued_by: 'УМВД России по г. Кирову',
                    issue_date: '2010-06-20',
                    unit_code: '430-001',
                    registration_address: 'г. Киров, ул. Ленина, д. 1',
                }
            },
            property: {
                property_kind: '2-комн. квартира',
                address: 'г. Киров, ул. Ленина, д. 1, кв. 10',
                cadastral_number: '43:40:001:002',
                price: 5000000,
            },
            deal: {
                commission: 60000,
                contract_end_date: '2026-12-31',
            }
        };

        const slots = buildSlotValues(data, 'agency_sale_1');
        expect(slots.principal_name).toBe('Петров Петр Петрович');
        expect(slots.principal_phone).toBe('+7 (999) 111-22-33');
        expect(slots.principal_series).toBe('33 14');
        expect(slots.principal_number).toBe('654321');
        expect(slots.prop_kind).toBe('2-комн. квартира');
        expect(slots.prop_address).toBe('г. Киров, ул. Ленина, д. 1, кв. 10');
        expect(slots.comm_formatted.replace(/\s/g, ' ')).toBe('60 000');
        expect(slots.price_formatted.replace(/\s/g, ' ')).toBe('5 000 000');
    });
});

describe('templateUtils - injectDataIntoTemplateHtml', () => {
    it('injects dynamic data into elements with data-slot-id', () => {
        const html = `
            <p>Мы, <span class="doc-slot" data-slot-id="principal_name">Старый Клиент</span>,</p>
            <p>телефон: <span class="doc-slot" data-slot-id="principal_phone">+7 000 000-00-00</span></p>
        `;
        const slotValues = {
            principal_name: 'Новый Клиент',
            principal_phone: '+7 (999) 777-88-99',
        };

        const result = injectDataIntoTemplateHtml(html, slotValues, true, false);
        expect(result).toContain('Новый Клиент');
        expect(result).not.toContain('Старый Клиент');
        expect(result).toContain('+7 (999) 777-88-99');
        expect(result).not.toContain('+7 000 000-00-00');
    });

    it('heals older saved templates that lack data-slot-id but have title or inputId', () => {
        const oldHtml = `
            <p>Мы, <span class="doc-slot doc-slot-filled" title="Поле из CRM: ФИО Принципала. Нажмите для редактирования.">Иванов Старый</span>,</p>
            <p>паспорт серия: <span class="doc-slot doc-slot-filled" data-input-id="doc-input-series">11 22</span></p>
        `;
        const slotValues = {
            principal_name: 'Сидоров Новый',
            principal_series: '44 55',
        };

        const result = injectDataIntoTemplateHtml(oldHtml, slotValues, true, false);
        expect(result).toContain('Сидоров Новый');
        expect(result).not.toContain('Иванов Старый');
        expect(result).toContain('44 55');
        expect(result).not.toContain('11 22');
    });
});

describe('templateUtils - sanitizeTemplateForSaving', () => {
    it('removes client personal data from template before saving', () => {
        const container = document.createElement('div');
        container.innerHTML = `
            <p>Мы, <span class="doc-slot doc-slot-filled" data-slot-id="principal_name" data-label="ФИО Принципала">Иванов Иван</span>,</p>
            <p>телефон: <span class="doc-slot doc-slot-filled" data-input-id="doc-input-phone" data-label="Телефон">+7 999 000-00-00</span></p>
        `;

        const sanitized = sanitizeTemplateForSaving(container);
        expect(sanitized).not.toContain('Иванов Иван');
        expect(sanitized).not.toContain('+7 999 000-00-00');
        expect(sanitized).toContain('[● Заполнить: ФИО Принципала]');
        expect(sanitized).toContain('[● Заполнить: Телефон]');
        expect(sanitized).toContain('data-slot-id="principal_name"');
        expect(sanitized).toContain('data-slot-id="principal_phone"');
    });

    it('extracts and populates 3-party rental contract slots accurately', () => {
        const data = {
            realtor: {
                full_name: 'Смирнов Алексей Владимирович',
                phone: '+7 912 888-77-66',
                inn: '434512345678',
                passport_details: {
                    series: '33 11',
                    number: '998877',
                    issued_by: 'УМВД по Кировской области',
                    issue_date: '2015-01-10',
                    registration_address: 'г. Киров, Октябрьский пр-т, 10'
                }
            },
            buyer: {
                full_name: 'Кузнецов Дмитрий Иванович',
                phone: '+7 900 123-45-67',
                email: 'kuznetsov@example.com',
                passport_details: {
                    series: '45 12',
                    number: '123456',
                    registration_address: 'г. Киров, ул. Воровского, 50'
                }
            },
            service1Cost: '5 000',
            service2Cost: '15 000',
            actDate: '2026-10-25'
        };

        const slots = buildSlotValues(data, 'services_rent_3party');
        expect(slots.realtor_name).toBe('Смирнов Алексей Владимирович');
        expect(slots.realtor_inn).toBe('434512345678');
        expect(slots.customer_name).toBe('Кузнецов Дмитрий Иванович');
        expect(slots.customer_email).toBe('kuznetsov@example.com');
        expect(slots.service1_cost.replace(/\s/g, ' ')).toBe('5 000');
        expect(slots.service2_cost.replace(/\s/g, ' ')).toBe('15 000');
        expect(slots.service1_words).toContain('пять тысяч');
        expect(slots.service2_words).toContain('пятнадцать тысяч');
    });
});
